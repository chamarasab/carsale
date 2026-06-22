const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { mkdir, rm, writeFile } = require('node:fs/promises');
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
const JP_CENTER_VENDOR_IDS = {
  TOYOTA: '1',
  NISSAN: '2',
  MITSUBISHI: '4',
  HONDA: '5',
  SUZUKI: '6',
  DAIHATSU: '9',
};

const jobs = [
  { maker: 'Toyota', model: 'Raize', listSize: 7 },
  { maker: 'Toyota', model: 'Roomy', listSize: 7 },
  { maker: 'Honda', model: 'Vezel', listSize: 7 },
  { maker: 'Honda', model: 'N BOX', listSize: 6 },
  { maker: 'Suzuki', model: 'Wagon R', listSize: 6 },
  { maker: 'Suzuki', model: 'Spacia', listSize: 5 },
  { maker: 'Daihatsu', model: 'Taft', listSize: 5 },
  { maker: 'Daihatsu', model: 'Rocky', listSize: 5 },
  { maker: 'Daihatsu', model: 'Thor', listSize: 2 },
];

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
    if (!html.includes('is_user_neo=1')) {
      throw new Error('JP Center login failed');
    }
  }

  async fetchAuctionPage({ vendor, model, page, listSize, yearFrom }) {
    const response = await this.request(`/aj_neo?file=loader&ajx=${Date.now()}-form`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: jpCenterLoaderFields({ vendor, model, page, listSize, yearFrom }),
    });
    return parseJpCenterLoader(await response.text());
  }

  async fetchAuctionImageUrls(sourceUrl) {
    const path = new URL(sourceUrl).pathname;
    const response = await this.request(path);
    return extractJpCenterImageUrls(await response.text());
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
  const db = mongoose.connection.db;
  const cars = db.collection('cars');

  await cars.deleteMany({});
  await rm('apps/api/public/images/jpcenter', { recursive: true, force: true });
  await mkdir('apps/api/public/images/jpcenter', { recursive: true });

  const client = new JpCenterClient(process.env.JPCENTER_USERNAME, process.env.JPCENTER_PASSWORD);
  await client.login();

  const results = [];
  for (const job of jobs) {
    const payload = await client.fetchAuctionPage({
      vendor: JP_CENTER_VENDOR_IDS[job.maker.toUpperCase()],
      model: job.model.toUpperCase(),
      page: 1,
      listSize: job.listSize,
      yearFrom: 2023,
    });

    const rows = (payload.body || []).slice(0, job.listSize);
    const docs = [];
    for (const row of rows) {
      docs.push(await toCarDoc(row, job, client));
    }

    if (docs.length) await cars.insertMany(docs);
    const summary = { ...job, fetched: payload.body?.length || 0, imported: docs.length };
    results.push(summary);
    console.log(JSON.stringify(summary));
  }

  const total = await cars.countDocuments({ published: true });
  const imageRecords = await cars.countDocuments({ images: new RegExp(`^${escapeRegExp(API_PUBLIC_URL.replace(/\/$/, ''))}/images/jpcenter/`) });
  const blankRecords = await cars.countDocuments({ images: FALLBACK_IMAGE });
  console.log(JSON.stringify({ total, imageRecords, blankRecords, results }, null, 2));
  await mongoose.disconnect();
}

async function toCarDoc(row, query, client) {
  const year = toNumber(row.g) || new Date().getFullYear();
  const engineCapacity = toNumber(row.h);
  const auctionPriceJpy = toNumber(row.t) || toNumber(row.s) || toNumber(row.o) || 0;
  const modelCode = cleanText(row.j);
  const chassisPrefix = cleanText(row.k);
  const grade = cleanText(row.r) || 'N/A';
  const trim = cleanDisplayText(row.l);
  const auctionName = cleanText(row.d) || 'Japan auction';
  const lotNumber = cleanText(row.c);
  const color = cleanDisplayText(row.w);
  const vehicleIdentity = `${query.model} ${modelCode} ${chassisPrefix} ${trim}`;
  const sourceUrl = `${JP_CENTER_BASE_URL}/${cleanText(row.f1) || 'aj'}-${cleanText(row.a)}.htm`;
  const imagePrefix = imageFilePrefix(query.model, lotNumber || cleanText(row.a));
  const detailImageUrls = await client.fetchAuctionImageUrls(sourceUrl);
  const images = await selectHighQualityImages(detailImageUrls.length ? detailImageUrls : imageUrlsFromTokens([row.x, row.y, row.z]), imagePrefix);
  const fuelType = inferFuelType(vehicleIdentity);
  const motorPowerKw = inferMotorPowerKw(vehicleIdentity);
  const now = new Date();
  const cost = calculateImportCost({
    auctionPriceJpy,
    exchangeRateLkr: Number(process.env.JPY_TO_LKR || 2.08),
    freightJpy: Number(process.env.DEFAULT_FREIGHT_JPY || 220000),
    insuranceJpy: Number(process.env.DEFAULT_INSURANCE_JPY || 50000),
    vehicleType: 'Car',
    fuelType,
    engineCapacity,
    motorPowerKw,
    manufactureYear: year,
    bankChargesLkr: Number(process.env.DEFAULT_BANK_CHARGES_LKR || 45000),
    clearingChargesLkr: Number(process.env.DEFAULT_CLEARING_CHARGES_LKR || 220000),
    importerCommissionLkr: Number(process.env.DEFAULT_IMPORTER_COMMISSION_LKR || 220000),
    localTransportLkr: Number(process.env.DEFAULT_LOCAL_TRANSPORT_LKR || 95000),
  });

  return {
    title: cleanDisplayText([year, titleCase(query.maker), titleCase(query.model), trim].filter(Boolean).join(' ')),
    maker: titleCase(query.maker),
    model: titleCase(query.model),
    modelCode,
    year,
    mileageKm: toNumber(row.q),
    fuelType,
    transmission: 'Automatic',
    auctionGrade: grade,
    chassisCode: [chassisPrefix, modelCode].filter(Boolean).join(' ') || lotNumber,
    location: auctionName,
    source: 'JP Center',
    sourceUrl,
    images,
    features: [
      lotNumber ? `Lot ${lotNumber}` : '',
      color ? `${titleCase(color)} exterior` : '',
      engineCapacity ? `${engineCapacity}cc engine` : '',
      trim ? `Grade ${trim}` : '',
    ].filter(Boolean),
    cost,
    status: 'available',
    published: true,
    createdAt: now,
    updatedAt: now,
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

function imageUrlsFromTokens(tokens) {
  return tokens.map(cleanText).filter(Boolean).map((token) => `https://8.ajes.com/imgs/${token}`);
}

function extractJpCenterImageUrls(html) {
  const urls = [...html.matchAll(/https?:\/\/(?:\d+\.)?ajes\.com\/imgs\/[^"' <>)]+/g)]
    .map((match) => match[0].replace(/&amp;/g, '&'))
    .map((url) => url.replace(/[?&]w=\d+$/, '').replace(/&w=\d+$/, ''));
  return [...new Set(urls)];
}

async function fetchImage(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
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

function jpCenterLoaderFields(options) {
  return new URLSearchParams({
    url_loader: 'aj_neo?file=loader',
    page: String(options.page),
    sort_ord: '',
    url_luboy: 'Any',
    url_lubaya: 'Any',
    lose_time_here_buT_not_buy_servlce_for_100_usd_monthly_here_http_avto_jp: 'http://avto.jp/specification.html',
    tpl: '',
    edit_post: '',
    is_stat: '0',
    vendor: options.vendor,
    model: options.model,
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
    list_size: String(options.listSize),
    _list_size: String(options.listSize),
    lhw: '',
    eqqp: '',
    stDt1: '',
    stDt2: '',
    sanction: '',
    year: String(options.yearFrom || ''),
    year2: '',
    probeg: '',
    probeg2: '',
    eng_v: '',
    eng_v2: '',
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
  const script = tplMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  const normalizedScript = script.replace(/\\"/g, '"');
  const dataMatch = normalizedScript.match(/var\s+data\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!dataMatch) throw new Error('JP Center auction data is malformed');
  return JSON.parse(dataMatch[1].replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'));
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

function resolveApiPath(relativePath) {
  const cwdPath = join(process.cwd(), relativePath);
  if (existsSync(join(process.cwd(), 'src'))) return cwdPath;
  return join(process.cwd(), 'apps/api', relativePath);
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

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,]+=)/);
}

function toNumber(value) {
  return Number.parseInt(value || '0', 10) || 0;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferFuelType(model) {
  if (/a202a|e-smart|e smart/i.test(model)) return 'e-SMART Hybrid';
  if (/e-power|e power/i.test(model)) return 'e-POWER Hybrid';
  if (/(prius|aqua|hybrid|insight|e:?hev|(?:^|[\s:_-])hev(?:$|[\s:_-])|g[_-]?hev|a202s)/i.test(model)) return 'Hybrid';
  if (/(leaf|sakura|bz4x)/i.test(model)) return 'Electric';
  return 'Petrol';
}

function inferMotorPowerKw(vehicleIdentity) {
  return /a202a/i.test(vehicleIdentity) ? 78 : undefined;
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
