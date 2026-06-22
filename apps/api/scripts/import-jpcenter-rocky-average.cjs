const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { existsSync } = require('node:fs');
const { mkdir, writeFile } = require('node:fs/promises');
const { extname, join } = require('node:path');
const { calculateImportCost } = require('../dist/cars/tax-calculator');
const { DEFAULT_TAX_SETTINGS } = require('../dist/settings/default-tax-settings');

dotenv.config({ path: 'apps/api/.env' });

const JP_CENTER_BASE_URL = 'https://jpcenter.ru';
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || 'https://carsale-1.onrender.com').replace(/\/$/, '');
const LOCAL_IMAGE_ROUTE = '/images/jpcenter';
const TARGET_CARS = 2;
const LIST_SIZE = 50;
const MAX_PAGES = 5;
const YEAR_FROM = 2023;
const YEAR_TO = 2026;
const ROCKY_FREIGHT_JPY = 320_000;
const ROCKY_INSURANCE_JPY = 5_000;

const ROCKY_YELLOW_BOOK = {
  A202S: {
    freightJpy: 95_500,
    grades: { 'PREMIUM G HEV': 2_460_700 },
  },
};

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

  async fetchAuctionPage(page) {
    const response = await this.request(`/aj_neo?file=loader&ajx=${Date.now()}-form`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: jpCenterLoaderFields(page),
    });
    return parseJpCenterLoader(await response.text());
  }

  async fetchDetail(sourceUrl) {
    const response = await this.request(new URL(sourceUrl).pathname);
    return response.text();
  }

  async request(path, init = {}) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const headers = new Headers(init.headers);
        const cookie = Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join('; ');
        if (cookie) headers.set('cookie', cookie);

        const response = await fetch(new URL(path, JP_CENTER_BASE_URL), { ...init, headers });
        this.storeCookies(response.headers);
        if (!response.ok) throw new Error(`JP Center request failed: ${response.status}`);
        return response;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await delay(attempt * 500);
      }
    }
    throw lastError;
  }

  storeCookies(headers) {
    const setCookies =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : splitSetCookie(headers.get('set-cookie'));
    for (const cookie of setCookies) {
      const [pair] = cookie.split(';');
      const separator = pair.indexOf('=');
      if (separator > 0) {
        this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
      }
    }
  }
}

async function main() {
  if (!process.env.JPCENTER_USERNAME || !process.env.JPCENTER_PASSWORD) {
    throw new Error('JPCENTER_USERNAME and JPCENTER_PASSWORD are required');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'carsale',
  });
  const cars = mongoose.connection.db.collection('cars');
  const exchangeRate = await fetchJpyToLkrRate();
  const client = new JpCenterClient(
    process.env.JPCENTER_USERNAME,
    process.env.JPCENTER_PASSWORD,
  );
  await client.login();

  const imported = [];
  const skipped = [];

  for (let page = 1; page <= MAX_PAGES && imported.length < TARGET_CARS; page += 1) {
    const payload = await client.fetchAuctionPage(page);
    for (const row of payload.body || []) {
      if (imported.length >= TARGET_CARS) break;
      if (!isEligibleAveragePriceRow(row)) continue;

      const sourceUrl = `${JP_CENTER_BASE_URL}/${cleanText(row.f1) || 'aj'}-${cleanText(row.a)}.htm`;
      const html = await client.fetchDetail(sourceUrl);
      const media = await fetchRequiredMedia(extractJpCenterImageUrls(html));

      if (!media.vehiclePhotos.length || !media.auctionSheet) {
        skipped.push({
          sourceUrl,
          reason: 'Incomplete media',
          vehiclePhotos: media.vehiclePhotos.length,
          auctionSheet: Boolean(media.auctionSheet),
        });
        continue;
      }

      const images = await saveSelectedMedia(
        [...media.vehiclePhotos, media.auctionSheet],
        imageFilePrefix('Rocky', row.c || row.a),
      );
      const doc = buildCarDoc(row, sourceUrl, images, exchangeRate);
      await cars.updateOne(
        { sourceUrl },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
      const saved = await cars.findOne({ sourceUrl });
      imported.push({
        id: saved._id.toString(),
        title: saved.title,
        sourceUrl,
        averagePriceJpy: saved.cost.auctionPriceJpy,
        images: saved.images.length,
        totalLkr: saved.cost.totalLkr,
      });
      console.log(JSON.stringify(imported.at(-1)));
    }
  }

  if (imported.length < TARGET_CARS) {
    throw new Error(`Only ${imported.length} qualifying Rocky records had usable media`);
  }

  await syncClientFallback(cars);
  console.log(JSON.stringify({ imported, skipped, exchangeRate }, null, 2));
  await mongoose.disconnect();
}

function isEligibleAveragePriceRow(row) {
  const year = toNumber(row.g);
  return (
    year >= YEAR_FROM &&
    year <= YEAR_TO &&
    toNumber(row.h) >= 1_190 &&
    toNumber(row.h) <= 1_200 &&
    cleanText(row.j).toUpperCase() === 'A202S' &&
    /PREMIUM\s+G[_ -]?HEV/i.test(cleanText(row.l)) &&
    toNumber(row.o) > 0 &&
    cleanText(row.p).length > 0
  );
}

function buildCarDoc(row, sourceUrl, images, exchangeRate) {
  const year = toNumber(row.g);
  const engineCapacity = toNumber(row.h);
  const modelCode = cleanText(row.j).toUpperCase();
  const grade = cleanDisplayText(row.l).replace(/_/g, ' ') || 'N/A';
  const averagePriceJpy = toNumber(row.o);
  const averageHistory = parseAverageHistory(row.p);
  const fuelType = 'e-SMART Hybrid';
  const motorPowerKw = 78;
  const yellowBook = rockyYellowBookReference(modelCode, grade);
  const cost = calculateImportCost(
    {
      auctionPriceJpy: averagePriceJpy,
      exchangeRateLkr: exchangeRate.rate,
      exchangeRateDate: exchangeRate.date,
      exchangeRateSource: exchangeRate.source,
      exchangeRateProvider: exchangeRate.provider,
      invoiceCifJpy: averagePriceJpy + ROCKY_FREIGHT_JPY,
      yellowBookValueJpy: yellowBook.valueJpy,
      yellowBookFreightJpy: yellowBook.freightJpy,
      depreciationRate: 0.85,
      freightJpy: ROCKY_FREIGHT_JPY,
      insuranceJpy: ROCKY_INSURANCE_JPY,
      vehicleType: 'Car',
      fuelType,
      engineCapacity,
      motorPowerKw,
      manufactureYear: year,
      bankChargesLkr: 45_000,
      clearingChargesLkr: 85_000,
      importerCommissionLkr: 0,
      localTransportLkr: 0,
      referenceModel: `${modelCode} ${grade}`,
      referenceSource: 'https://www.daihatsu.co.jp/lineup/rocky/02_grade.htm',
      calculationBasis: 'JP Center Average Price with Daihatsu MSRP reference',
    },
    DEFAULT_TAX_SETTINGS,
  );

  return {
    title: cleanDisplayText(`${year} Daihatsu Rocky ${grade}`),
    maker: 'Daihatsu',
    model: 'Rocky',
    modelCode,
    year,
    mileageKm: toNumber(row.q),
    fuelType,
    transmission: normalizeTransmission(row.k),
    auctionGrade: cleanText(row.r) || 'N/A',
    chassisCode: modelCode || cleanText(row.c),
    location: cleanText(row.d) || 'Japan auction',
    source: 'JP Center',
    sourceUrl,
    images,
    features: [
      row.c ? `Lot ${cleanText(row.c)}` : '',
      row.e ? `Auction date ${cleanText(row.e)}` : '',
      row.w ? `${titleCase(cleanDisplayText(row.w))} exterior` : '',
      engineCapacity ? `${engineCapacity}cc engine` : '',
      motorPowerKw ? `${motorPowerKw}kW traction motor` : '',
      `JP Center average JPY ${averagePriceJpy.toLocaleString('en-US')}`,
      averageHistory.length
        ? `Average based on ${averageHistory.length} sales: ${averageHistory
            .map((value) => `JPY ${value.toLocaleString('en-US')}`)
            .join(', ')}`
        : '',
      `Grade ${grade}`,
      `Includes ${images.length - 1} vehicle photos and auction sheet`,
    ].filter(Boolean),
    cost,
    status: 'available',
    published: true,
    updatedAt: new Date(),
  };
}

function rockyYellowBookReference(modelCode, grade) {
  const reference = ROCKY_YELLOW_BOOK[modelCode];
  if (!reference) return { valueJpy: undefined, freightJpy: undefined };
  const gradeKey = normalizeRockyGrade(grade);
  return {
    valueJpy: reference.grades[gradeKey],
    freightJpy: reference.freightJpy,
  };
}

function normalizeRockyGrade(grade) {
  const normalized = cleanDisplayText(grade).toUpperCase();
  if (/PREMIUM\s+G[_ -]?HEV/.test(normalized)) return 'PREMIUM G HEV';
  return '';
}

function normalizeTransmission(value) {
  const normalized = cleanText(value).toUpperCase();
  if (normalized.includes('AT') || normalized === 'FA') return 'Automatic';
  return normalized || 'Automatic';
}

function parseAverageHistory(value) {
  return cleanText(value)
    .split(',')
    .map((item) => toNumber(item) * 1_000)
    .filter(Boolean);
}

async function fetchRequiredMedia(urls) {
  const vehiclePhotos = [];
  let auctionSheet;

  for (const url of urls) {
    const image = await fetchImage(url);
    if (!image) continue;
    if (isVehiclePhoto(image.dimensions)) {
      vehiclePhotos.push(image);
    } else if (!auctionSheet && isAuctionSheet(image.dimensions)) {
      auctionSheet = image;
    }
  }

  return { vehiclePhotos, auctionSheet };
}

async function fetchImage(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = readImageDimensions(buffer);
    if (!dimensions) return null;
    return {
      buffer,
      contentType: response.headers.get('content-type') || '',
      dimensions,
      url,
    };
  } catch {
    return null;
  }
}

async function saveSelectedMedia(images, sourceKey) {
  const imagesDir = resolveApiPath('public/images/jpcenter');
  await mkdir(imagesDir, { recursive: true });
  const timestampBase = new Date();
  const saved = [];

  for (const [index, image] of images.entries()) {
    const filename = `${sourceKey}_${formatFileTimestamp(
      addSeconds(timestampBase, index),
    )}${imageExtension(image.buffer, image.contentType, image.url)}`;
    await writeFile(join(imagesDir, filename), image.buffer);
    saved.push(`${API_PUBLIC_URL}${LOCAL_IMAGE_ROUTE}/${filename}`);
  }

  return saved;
}

async function syncClientFallback(cars) {
  const docs = await cars.find({ published: true }).sort({ createdAt: -1 }).toArray();
  await writeFile(
    resolveWorkspacePath('apps/client/public/jpcenter-cars.json'),
    `${JSON.stringify(docs, null, 2)}\n`,
  );
}

function extractJpCenterImageUrls(html) {
  const urls = [...html.matchAll(/https?:\/\/(?:\d+\.)?ajes\.com\/imgs\/[^"' <>)]+/g)]
    .map((match) => match[0].replace(/&amp;/g, '&'))
    .map((url) =>
      url
        .replace(/[?&][wh]=\d+$/g, '')
        .replace(/&[wh]=\d+$/g, ''),
    );
  return [...new Set(urls)];
}

function isVehiclePhoto(dimensions) {
  return dimensions.width >= 600 && dimensions.height >= 400 && dimensions.width > dimensions.height;
}

function isAuctionSheet(dimensions) {
  return dimensions.width >= 500 && dimensions.height >= 500 && dimensions.height >= dimensions.width * 0.9;
}

function readImageDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) return null;
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        };
      }
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

function jpCenterLoaderFields(page) {
  return new URLSearchParams({
    url_loader: 'aj_neo?file=loader',
    page: String(page),
    sort_ord: '',
    url_luboy: 'Any',
    url_lubaya: 'Any',
    lose_time_here_buT_not_buy_servlce_for_100_usd_monthly_here_http_avto_jp:
      'http://avto.jp/specification.html',
    tpl: '',
    edit_post: '',
    is_stat: '0',
    vendor: '9',
    model: 'ROCKY',
    bid: '',
    kuzov: '',
    rate: '',
    status: '',
    kpp_add: '',
    colour: '',
    auct_name: '',
    _day: '',
    _rate: '',
    _status: '',
    _kpp_add: '',
    _auct_name: '',
    list_size: String(LIST_SIZE),
    _list_size: String(LIST_SIZE),
    lhw: '',
    eqqp: '',
    stDt1: '',
    stDt2: '',
    sanction: '',
    year: String(YEAR_FROM),
    year2: String(YEAR_TO),
    probeg: '',
    probeg2: '',
    eng_v: '1200',
    eng_v2: '1200',
    price_start: '',
    price_start2: '',
    price_finish: '',
    price_finish2: '',
    _year: '',
    _year2: '',
    _probeg: '',
    _probeg2: '',
    _eng_v: '',
    _eng_v2: '',
    _price_start: '',
    _price_start2: '',
    _price_finish: '',
    _price_finish2: '',
  });
}

function parseJpCenterLoader(body) {
  const tplMatch = body.match(/'tpl_poisk'\s*:\s*'((?:\\'|[^'])*)'/);
  if (!tplMatch) throw new Error('JP Center loader did not return auction data');
  const script = tplMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\"/g, '"');
  const dataMatch = script.match(/var\s+data\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!dataMatch) throw new Error('JP Center auction data is malformed');
  return JSON.parse(
    dataMatch[1].replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'),
  );
}

async function fetchJpyToLkrRate() {
  const source =
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json';
  const fallbackRate = Number(process.env.JPY_TO_LKR || 2.08);
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);
    const payload = await response.json();
    const rate = payload.jpy?.lkr;
    if (!rate || !Number.isFinite(rate)) throw new Error('JPY to LKR rate is missing');
    return {
      rate,
      date: payload.date || new Date().toISOString().slice(0, 10),
      source,
      provider: 'fawazahmed0 currency-api',
    };
  } catch {
    return {
      rate: fallbackRate,
      date: new Date().toISOString().slice(0, 10),
      source: 'JPY_TO_LKR',
      provider: 'Environment fallback',
    };
  }
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

function imageFilePrefix(model, lotOrId) {
  const modelPart = titleCase(model).replace(/[^a-zA-Z0-9]/g, '') || 'Jpcenter';
  const numericPart = String(lotOrId || '').replace(/\D/g, '').slice(-5).padStart(5, '0');
  return `${modelPart}${numericPart}`;
}

function addSeconds(value, seconds) {
  return new Date(value.getTime() + seconds * 1_000);
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

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,]+=)/);
}

function cleanText(value) {
  return String(value || '').trim();
}

function cleanDisplayText(value) {
  return cleanText(value)
    .replace(/[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return cleanText(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toNumber(value) {
  return Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10) || 0;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
