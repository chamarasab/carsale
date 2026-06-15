const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { mkdir, writeFile } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { extname, join } = require('node:path');
const { calculateImportCost } = require('../dist/cars/tax-calculator');

dotenv.config({ path: 'apps/api/.env' });

const JP_CENTER_BASE_URL = 'https://jpcenter.ru';
const MIN_IMAGE_WIDTH = 320;
const MIN_IMAGE_HEIGHT = 240;
const MIN_AUCTION_SHEET_WIDTH = 220;
const MIN_AUCTION_SHEET_HEIGHT = 320;
const FALLBACK_IMAGE = '/blank-car-logo.svg';
const LOCAL_IMAGE_ROUTE = '/images/jpcenter';
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'https://carsale-1.onrender.com';
const DEFAULT_DETAIL_URLS = [
  'https://jpcenter.ru/aj-jDxsWnkhOXMYlJG.htm',
  'https://jpcenter.ru/aj-TOlA7fgI9rjoW3.htm',
  'https://jpcenter.ru/aj-3onrhEGhxysHpgO.htm',
];
const DETAIL_URLS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DETAIL_URLS;

class JpCenterClient {
  cookies = new Map();

  constructor(username, password) {
    this.username = username;
    this.password = password;
  }

  async login() {
    await this.request('/');
    const response = await this.request('/set', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: this.username,
        password: this.password,
        is_login: '1',
        ref: 'aj_neo',
      }),
    });
    const html = await response.text();
    if (!html.includes('is_user_neo=1')) throw new Error('JP Center login failed');
  }

  async fetchDetail(sourceUrl) {
    const response = await this.request(new URL(sourceUrl).pathname);
    return response.text();
  }

  async request(path, init = {}) {
    const headers = new Headers(init.headers);
    const cookie = Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join('; ');
    if (cookie) headers.set('cookie', cookie);

    const response = await fetch(new URL(path, JP_CENTER_BASE_URL), { ...init, headers });
    this.storeCookies(response.headers);
    if (!response.ok) throw new Error(`JP Center request failed: ${response.status}`);
    return response;
  }

  storeCookies(headers) {
    const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : splitSetCookie(headers.get('set-cookie'));
    for (const cookie of setCookies) {
      const [pair] = cookie.split(';');
      const [key, value] = pair.split('=');
      if (key && value) this.cookies.set(key.trim(), value.trim());
    }
  }
}

async function main() {
  if (!process.env.JPCENTER_USERNAME || !process.env.JPCENTER_PASSWORD) {
    throw new Error('JPCENTER_USERNAME and JPCENTER_PASSWORD are required');
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'carsale' });
  const cars = mongoose.connection.db.collection('cars');

  const client = new JpCenterClient(process.env.JPCENTER_USERNAME, process.env.JPCENTER_PASSWORD);
  await client.login();

  const imported = [];
  for (const sourceUrl of DETAIL_URLS) {
    const html = await client.fetchDetail(sourceUrl);
    const doc = await toCarDoc(html, sourceUrl);
    await cars.updateOne({ sourceUrl }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    const saved = await cars.findOne({ sourceUrl });
    imported.push({
      id: saved._id.toString(),
      title: saved.title,
      sourceUrl,
      images: saved.images.length,
    });
    console.log(JSON.stringify(imported.at(-1)));
  }

  await syncClientFallback(cars);

  const total = await cars.countDocuments({ published: true });
  console.log(JSON.stringify({ imported, total }, null, 2));
  await mongoose.disconnect();
}

async function toCarDoc(html, sourceUrl) {
  const meta = parseDetailMeta(html, sourceUrl);
  const imageUrls = extractJpCenterImageUrls(html);
  const images = await selectHighQualityImages(imageUrls, imageFilePrefix(meta.model, meta.lotNumber));
  const fuelType = inferFuelType(meta.model, html);
  const now = new Date();
  const cost = calculateImportCost(buildCostInput(meta, fuelType));

  return {
    title: cleanDisplayText([meta.year, meta.maker, meta.model, meta.grade].filter(Boolean).join(' ')),
    maker: titleCase(meta.maker),
    model: titleCase(meta.model),
    modelCode: meta.chassisCode,
    year: meta.year,
    mileageKm: meta.mileageKm,
    fuelType,
    transmission: meta.transmission,
    auctionGrade: meta.auctionGrade,
    chassisCode: meta.chassisCode || meta.lotNumber,
    location: meta.auctionName,
    source: 'JP Center',
    sourceUrl,
    images,
    features: [
      meta.lotNumber ? `Lot ${meta.lotNumber}` : '',
      meta.color ? `${titleCase(meta.color)} exterior` : '',
      meta.engineCapacity ? `${meta.engineCapacity}cc engine` : '',
      meta.grade ? `Grade ${meta.grade}` : '',
    ].filter(Boolean),
    cost,
    status: 'available',
    published: true,
    updatedAt: now,
  };
}

function buildCostInput(meta, fuelType) {
  const everyPreset = suzukiEveryCostPreset(meta);
  if (everyPreset) {
    return {
      ...everyPreset,
      fuelType,
      engineCapacity: meta.engineCapacity || 660,
      manufactureYear: meta.year,
    };
  }

  return {
    auctionPriceJpy: meta.auctionPriceJpy,
    exchangeRateLkr: Number(process.env.JPY_TO_LKR || 2.08),
    freightJpy: Number(process.env.DEFAULT_FREIGHT_JPY || 220000),
    insuranceJpy: Number(process.env.DEFAULT_INSURANCE_JPY || 50000),
    vehicleType: 'Car',
    fuelType,
    engineCapacity: meta.engineCapacity,
    manufactureYear: meta.year,
    bankChargesLkr: Number(process.env.DEFAULT_BANK_CHARGES_LKR || 45000),
    clearingChargesLkr: Number(process.env.DEFAULT_CLEARING_CHARGES_LKR || 220000),
    importerCommissionLkr: Number(process.env.DEFAULT_IMPORTER_COMMISSION_LKR || 220000),
    localTransportLkr: Number(process.env.DEFAULT_LOCAL_TRANSPORT_LKR || 95000),
  };
}

function parseDetailMeta(html, sourceUrl) {
  const logParts = hiddenValue(html, 'log').split(':');
  const [, lotNumber, auctionName, auctionDate, chassisCode, maker, model] = logParts;
  const year = toNumber(hiddenValue(html, 'year')) || new Date().getFullYear();
  const grade = cleanDisplayText(decodeHtml(hiddenValue(html, 'grade')));
  const auctionGrade = cleanDisplayText(decodeHtml(hiddenValue(html, 'rate'))) || 'N/A';
  const mileageKm = toNumber(hiddenValue(html, 'probeg_hist')) || mileageBucketToKm(hiddenValue(html, 'probeg'));
  const color = cleanDisplayText(decodeHtml(hiddenValue(html, 'colour_hist')));
  const auctionPriceJpy = toNumber(hiddenValue(html, 'price_finish'));
  const engineCapacity = parseEngineCapacity(html) || inferEngineCapacity(model, chassisCode);
  const transmission = inferTransmission(html);

  if (!maker || !model) throw new Error(`Unable to parse JP Center metadata for ${sourceUrl}`);

  return {
    lotNumber: cleanText(lotNumber),
    auctionName: cleanDisplayText(auctionName) || 'Japan auction',
    auctionDate: cleanText(auctionDate),
    chassisCode: cleanDisplayText(chassisCode),
    maker: titleCase(maker),
    model: titleCase(model),
    year,
    grade,
    auctionGrade,
    mileageKm,
    color,
    auctionPriceJpy,
    engineCapacity,
    transmission,
  };
}

async function selectHighQualityImages(urls, sourceKey) {
  const images = [];
  const timestampBase = new Date();

  for (const [index, url] of urls.entries()) {
    const image = await fetchImage(url);
    if (!image || !isUsableVehicleImage(image.dimensions)) continue;
    const localPath = await saveImage(image, sourceKey, timestampBase, index);
    images.push(`${API_PUBLIC_URL.replace(/\/$/, '')}${localPath}`);
  }

  return images.length ? images : [FALLBACK_IMAGE];
}

function extractJpCenterImageUrls(html) {
  const urls = [...html.matchAll(/https?:\/\/(?:\d+\.)?ajes\.com\/imgs\/[^"' <>)]+/g)]
    .map((match) => match[0].replace(/&amp;/g, '&'))
    .map((url) => url.replace(/[?&][wh]=\d+$/g, '').replace(/&[wh]=\d+$/g, ''));
  return [...new Set(urls)];
}

async function fetchImage(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = readImageDimensions(buffer);
    if (!dimensions) return null;
    return { buffer, contentType: response.headers.get('content-type') || '', dimensions, url };
  } catch {
    return null;
  }
}

async function saveImage(image, sourceKey, timestampBase, index) {
  const imagesDir = resolveApiPath('public/images/jpcenter');
  await mkdir(imagesDir, { recursive: true });
  const filename = `${sourceKey}_${formatFileTimestamp(addSeconds(timestampBase, index))}${imageExtension(image.buffer, image.contentType, image.url)}`;
  await writeFile(join(imagesDir, filename), image.buffer);
  return `${LOCAL_IMAGE_ROUTE}/${filename}`;
}

async function syncClientFallback(cars) {
  const docs = await cars.find({ published: true }).sort({ createdAt: -1 }).toArray();
  await writeFile(resolveWorkspacePath('apps/client/public/jpcenter-cars.json'), `${JSON.stringify(docs, null, 2)}\n`);
}

function readImageDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) return null;
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      offset += 2 + size;
    }
  }
  return null;
}

function imageExtension(buffer, contentType, url) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg';
  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return '.png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif';
  if (contentType.includes('jpeg')) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('gif')) return '.gif';
  return extname(new URL(url).pathname) || '.jpg';
}

function isUsableVehicleImage(dimensions) {
  const landscapePhoto = dimensions.width >= MIN_IMAGE_WIDTH && dimensions.height >= MIN_IMAGE_HEIGHT;
  const portraitAuctionSheet = dimensions.width >= MIN_AUCTION_SHEET_WIDTH && dimensions.height >= MIN_AUCTION_SHEET_HEIGHT;
  return landscapePhoto || portraitAuctionSheet;
}

function hiddenValue(html, name) {
  const pattern = new RegExp(`name=${name}\\s+value=(?:'([^']*)'|"([^"]*)"|([^ >]*))`, 'i');
  const match = html.match(pattern);
  return decodeHtml(cleanText(match?.[1] || match?.[2] || match?.[3]));
}

function parseEngineCapacity(html) {
  const match = html.match(/<\/font><\/span>&nbsp;&nbsp;(\d{3,5})&nbsp;cc/i) || html.match(/(\d{3,5})&nbsp;cc/i);
  return toNumber(match?.[1]);
}

function inferEngineCapacity(model, chassisCode) {
  if (/AAHH40W/i.test(chassisCode || '') || /hybrid/i.test(model || '')) return 2500;
  if (/TAHA45W/i.test(chassisCode || '')) return 2400;
  return 2500;
}

function inferTransmission(html) {
  const match = html.match(/<font style="color:#a93f15">([^<]+)<\/font><\/span>&nbsp;&nbsp;\d+&nbsp;cc/i);
  const value = cleanText(match?.[1]);
  return value ? value.toUpperCase() : 'Automatic';
}

function inferFuelType(model, html) {
  return /(hybrid|&nbsp;Hybrid)/i.test(`${model} ${html}`) ? 'Hybrid' : 'Petrol';
}

function mileageBucketToKm(value) {
  const match = cleanText(value).match(/^(\d+)-/);
  return match ? toNumber(match[1]) * 1000 : 0;
}

function resolveApiPath(relativePath) {
  const cwdPath = join(process.cwd(), relativePath);
  if (existsSync(join(process.cwd(), 'src'))) return cwdPath;
  return join(process.cwd(), 'apps/api', relativePath);
}

function resolveWorkspacePath(relativePath) {
  if (existsSync(join(process.cwd(), 'apps'))) return join(process.cwd(), relativePath);
  return join(process.cwd(), '..', '..', relativePath);
}

function addSeconds(value, seconds) {
  return new Date(value.getTime() + seconds * 1000);
}

function formatFileTimestamp(value) {
  return [
    value.getFullYear().toString().slice(-2),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
    String(value.getSeconds()).padStart(2, '0'),
  ].join('');
}

function imageFilePrefix(model, lotOrId) {
  const modelPart = titleCase(model).replace(/[^a-zA-Z0-9]/g, '') || 'Jpcenter';
  const numericPart = String(lotOrId || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `${modelPart}${numericPart}`;
}

function suzukiEveryCostPreset(meta) {
  if (!/suzuki/i.test(meta.maker) || !/every/i.test(meta.model) || !/DA17V/i.test(meta.chassisCode || '')) return null;

  const grade = normalizeGrade(meta.grade);
  const common = {
    depreciationRate: 0.85,
    yellowBookFreightJpy: 95500,
    insuranceJpy: 5000,
    vehicleType: 'Commercial Van',
    exciseDutyLkr: 1992000,
    exciseRatePerUnitLkr: 0,
    vehicleEntitlementLevyLkr: 15000,
    ssclRate: 0,
    luxuryThresholdLkr: 5500000,
    luxuryRate: 0.8,
    comExmSealLkr: 1750,
    importerCommissionLkr: 0,
    localTransportLkr: 0,
  };

  if (grade.includes('JOIN TURBO')) {
    return {
      ...common,
      auctionPriceJpy: 1255000,
      exchangeRateLkr: 2,
      yellowBookValueJpy: 1665600,
      freightJpy: 320000,
      cidRate: 0.2,
      cidSurchargeRate: 0.5,
      vatRate: 0.18,
      bankChargesLkr: 45000,
      clearingChargesLkr: 85000,
      depositLkr: 250000,
    };
  }

  if (grade === 'JOIN') {
    return {
      ...common,
      auctionPriceJpy: 1200000,
      exchangeRateLkr: 2,
      yellowBookValueJpy: 1544400,
      freightJpy: 300000,
      cidRate: 0.3,
      cidSurchargeRate: 0.5,
      vatRate: 0.205,
      bankChargesLkr: 45000,
      clearingChargesLkr: 85000,
      depositLkr: 0,
    };
  }

  if (grade.includes('PC')) {
    return {
      ...common,
      auctionPriceJpy: 775000,
      exchangeRateLkr: 2,
      yellowBookValueJpy: 1485000,
      freightJpy: 320000,
      cidRate: 0.3,
      cidSurchargeRate: 0.5,
      vatRate: 0.18,
      bankChargesLkr: 45000,
      clearingChargesLkr: 85000,
      depositLkr: 400000,
    };
  }

  if (grade.includes('PA LTD') || grade.includes('PA LIMITED')) {
    return {
      ...common,
      auctionPriceJpy: 1100000,
      exchangeRateLkr: 2.1,
      yellowBookValueJpy: 1777600,
      freightJpy: 310000,
      cidRate: 0.3,
      cidSurchargeRate: 0,
      vatRate: 0.205,
      bankChargesLkr: 0,
      clearingChargesLkr: 80000,
      depositLkr: 300000,
    };
  }

  return {
    ...common,
    auctionPriceJpy: 925000,
    exchangeRateLkr: 2.1,
    yellowBookValueJpy: 1267200,
    freightJpy: 320000,
    cidRate: 0.2,
    cidSurchargeRate: 0.5,
    vatRate: 0.18,
    bankChargesLkr: 45000,
    clearingChargesLkr: 85000,
    depositLkr: 420000,
  };
}

function normalizeGrade(value) {
  return cleanDisplayText(value).toUpperCase().replace(/\s+/g, ' ').trim();
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,]+=)/);
}

function decodeHtml(value) {
  return cleanText(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toNumber(value) {
  return Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10) || 0;
}

function cleanText(value) {
  return String(value || '').trim();
}

function cleanDisplayText(value) {
  return cleanText(value).replace(/[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return cleanText(value).toLowerCase().split(/\s+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
