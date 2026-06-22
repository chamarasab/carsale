const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { writeFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { applyWorkbookReferenceCost } = require('../dist/cars/cost-reference');
const { calculateImportCost, prepareCostForRecalculation } = require('../dist/cars/tax-calculator');
const { DEFAULT_TAX_SETTINGS } = require('../dist/settings/default-tax-settings');

const apiRoot = resolve(__dirname, '..');
const repoRoot = resolve(apiRoot, '..', '..');

dotenv.config({ path: join(apiRoot, '.env') });

const JPY_TO_LKR_RATE_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json';
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || 'https://carsale-1.onrender.com').replace(/\/$/, '');
const MIN_ENGINE_CAPACITY_CC = readNumberArgument('--min-engine-cc');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'carsale' });
  const db = mongoose.connection.db;
  const cars = db.collection('cars');
  const exchangeRate = await fetchJpyToLkrRate();
  const docs = await cars.find({}).toArray();

  let recalculated = 0;
  let preservedEvery = 0;
  let unpublishedMissingPrice = 0;
  let skippedBelowMinimumEngineCapacity = 0;

  for (const car of docs) {
    const lockedEvery = isWorkbookLockedEvery(car);
    const engineCapacity = car.cost?.engineCapacity || 0;
    if (
      MIN_ENGINE_CAPACITY_CC &&
      engineCapacity < MIN_ENGINE_CAPACITY_CC &&
      !car.cost?.motorPowerKw
    ) {
      skippedBelowMinimumEngineCapacity += 1;
      continue;
    }
    const costInput = lockedEvery
      ? car.cost
      : {
          ...applyWorkbookReferenceCost(car),
          exchangeRateLkr: exchangeRate.rate,
          exchangeRateDate: exchangeRate.date,
          exchangeRateSource: exchangeRate.source,
          exchangeRateProvider: exchangeRate.provider,
        };

    const cost = calculateImportCost(
      lockedEvery ? costInput : prepareCostForRecalculation(costInput),
      DEFAULT_TAX_SETTINGS,
    );
    const missingReliablePrice = !lockedEvery && !cost.referenceCifJpy && !cost.auctionPriceJpy && cost.totalLkr < 3_000_000;
    const update = {
      cost,
      fuelType: cost.fuelType || car.fuelType,
      title: cleanDisplayText(car.title),
      features: (car.features || []).map(cleanDisplayText).filter(Boolean),
      updatedAt: new Date(),
    };

    if (missingReliablePrice) {
      update.published = false;
      update.status = 'reserved';
      unpublishedMissingPrice += 1;
    }

    await cars.updateOne({ _id: car._id }, { $set: update });
    recalculated += 1;
    if (lockedEvery) preservedEvery += 1;
  }

  const publicCars = (await cars.find({ published: true }).sort({ createdAt: -1 }).toArray()).map(toPublicCar);
  const syncedJson = join(repoRoot, 'apps/client/public/jpcenter-cars.json');
  await writeFile(syncedJson, `${JSON.stringify(publicCars, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        recalculated,
        preservedEvery,
        unpublishedMissingPrice,
        skippedBelowMinimumEngineCapacity,
        minEngineCapacityCc: MIN_ENGINE_CAPACITY_CC || null,
        exchangeRate,
        syncedJson,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

async function fetchJpyToLkrRate() {
  const fallbackRate = Number(process.env.JPY_TO_LKR || 2.08);

  try {
    const response = await fetch(JPY_TO_LKR_RATE_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);
    const payload = await response.json();
    const rate = payload.jpy?.lkr;
    if (!rate || !Number.isFinite(rate)) throw new Error('JPY to LKR rate is missing');

    return {
      base: 'JPY',
      quote: 'LKR',
      rate,
      date: payload.date || new Date().toISOString().slice(0, 10),
      provider: 'fawazahmed0 currency-api',
      source: JPY_TO_LKR_RATE_URL,
      fallback: false,
    };
  } catch {
    return {
      base: 'JPY',
      quote: 'LKR',
      rate: fallbackRate,
      date: new Date().toISOString().slice(0, 10),
      provider: 'Environment fallback',
      source: 'JPY_TO_LKR',
      fallback: true,
    };
  }
}

function isWorkbookLockedEvery(car) {
  return (
    /suzuki/i.test(car.maker || '') &&
    /every/i.test(car.model || '') &&
    /DA17V/i.test(car.chassisCode || '') &&
    car.cost?.vehicleType?.toLowerCase().includes('commercial van')
  );
}

function toPublicCar(car) {
  return {
    ...car,
    _id: car._id.toString(),
    images: (car.images || []).map((image) =>
      image.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):4000/i, API_PUBLIC_URL),
    ),
  };
}

function cleanDisplayText(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#\d*/g, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readNumberArgument(name) {
  const argument = process.argv.slice(2).find((value) => value.startsWith(`${name}=`));
  if (!argument) return 0;
  return Number(argument.slice(name.length + 1)) || 0;
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
