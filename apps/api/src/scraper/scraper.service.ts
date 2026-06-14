import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { CarsService } from '../cars/cars.service';
import { CreateCarDto } from '../cars/dto';

type JpCenterImportOptions = {
  maker?: string;
  model?: string;
  vendor?: string;
  yearFrom?: number;
  yearTo?: number;
  pages?: number;
  listSize?: number;
};

type JpCenterRow = Record<string, string>;

type JpCenterPayload = {
  navi?: {
    md?: string;
    rows?: string;
    page?: string;
  };
  body?: JpCenterRow[];
};

const JP_CENTER_BASE_URL = 'https://jpcenter.ru';
const MIN_IMAGE_WIDTH = 320;
const MIN_IMAGE_HEIGHT = 240;
const MIN_AUCTION_SHEET_WIDTH = 220;
const MIN_AUCTION_SHEET_HEIGHT = 320;
const FALLBACK_IMAGE = '/blank-car-logo.svg';
const LOCAL_IMAGE_ROUTE = '/images/jpcenter';
const JP_CENTER_VENDOR_IDS: Record<string, string> = {
  TOYOTA: '1',
  NISSAN: '2',
  MAZDA: '3',
  MITSUBISHI: '4',
  HONDA: '5',
  SUZUKI: '6',
  SUBARU: '7',
  ISUZU: '8',
  DAIHATSU: '9',
  MITSUOKA: '10',
  LEXUS: '23',
};

@Injectable()
export class ScraperService {
  constructor(
    private readonly carsService: CarsService,
    private readonly config: ConfigService,
  ) {}

  async importFromJsonFeed(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`Could not fetch source: ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new BadRequestException('Auction feed must return an array of cars');
    }

    const created = [];
    for (const item of payload) {
      created.push(await this.carsService.create(item as CreateCarDto));
    }

    return { imported: created.length, cars: created };
  }

  async previewHtmlSource(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`Could not fetch source: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    return {
      title: $('title').first().text().trim(),
      links: $('a')
        .slice(0, 10)
        .map((_, element) => ({
          text: $(element).text().trim(),
          href: $(element).attr('href'),
        }))
      .get(),
    };
  }

  async importFromJpCenter(options: JpCenterImportOptions) {
    const username = this.config.get<string>('JPCENTER_USERNAME');
    const password = this.config.get<string>('JPCENTER_PASSWORD');

    if (!username || !password) {
      throw new BadRequestException('JPCENTER_USERNAME and JPCENTER_PASSWORD are required');
    }

    const maker = (options.maker ?? 'Toyota').trim();
    const model = (options.model ?? 'Prius').trim().toUpperCase();
    const vendor = options.vendor ?? JP_CENTER_VENDOR_IDS[maker.toUpperCase()];

    if (!vendor) {
      throw new BadRequestException(`Unsupported JP Center maker: ${maker}`);
    }

    const pages = Math.min(Math.max(options.pages ?? 1, 1), 5);
    const listSize = Math.min(Math.max(options.listSize ?? 20, 1), 50);
    const client = new JpCenterClient(username, password);

    await client.login();

    const imported = [];
    let created = 0;
    let updated = 0;
    let fetched = 0;

    for (let page = 1; page <= pages; page += 1) {
      const payload = await client.fetchAuctionPage({
        vendor,
        model,
        page,
        listSize,
        yearFrom: options.yearFrom,
        yearTo: options.yearTo,
      });
      const rows = (payload.body ?? []).slice(0, listSize);
      fetched += rows.length;

      for (const row of rows) {
        const dto = await this.toCarDto(row, { maker, model }, client);
        const result = await this.carsService.upsertBySourceUrl(dto);
        imported.push(result.car);
        if (result.created) created += 1;
        else updated += 1;
      }

      if (rows.length < listSize) {
        break;
      }
    }

    return { fetched, imported: imported.length, created, updated, cars: imported };
  }

  private async toCarDto(row: JpCenterRow, query: { maker: string; model: string }, client: JpCenterClient): Promise<CreateCarDto> {
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
    const sourceUrl = `${JP_CENTER_BASE_URL}/${cleanText(row.f1) || 'aj'}-${cleanText(row.a)}.htm`;
    const imagePrefix = imageFilePrefix(query.model, lotNumber || cleanText(row.a));
    const detailImageUrls = await client.fetchAuctionImageUrls(sourceUrl);
    const images = await selectHighQualityImages(
      detailImageUrls.length ? detailImageUrls : imageUrlsFromTokens([row.x, row.y, row.z]),
      imagePrefix,
      this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000',
    );

    return {
      title: cleanDisplayText([year, titleCase(query.maker), titleCase(query.model), trim].filter(Boolean).join(' ')),
      maker: titleCase(query.maker),
      model: titleCase(query.model),
      modelCode,
      year,
      mileageKm: toNumber(row.q),
      fuelType: inferFuelType(query.model),
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
      cost: {
        auctionPriceJpy,
        exchangeRateLkr: this.config.get<number>('JPY_TO_LKR') ?? 2.08,
        freightJpy: this.config.get<number>('DEFAULT_FREIGHT_JPY') ?? 220000,
        insuranceJpy: this.config.get<number>('DEFAULT_INSURANCE_JPY') ?? 50000,
        vehicleType: 'Car',
        fuelType: inferFuelType(query.model),
        engineCapacity,
        manufactureYear: year,
        bankChargesLkr: this.config.get<number>('DEFAULT_BANK_CHARGES_LKR') ?? 45000,
        clearingChargesLkr: this.config.get<number>('DEFAULT_CLEARING_CHARGES_LKR') ?? 220000,
        importerCommissionLkr: this.config.get<number>('DEFAULT_IMPORTER_COMMISSION_LKR') ?? 220000,
        localTransportLkr: this.config.get<number>('DEFAULT_LOCAL_TRANSPORT_LKR') ?? 95000,
      },
      status: 'available',
      published: true,
    };
  }
}

class JpCenterClient {
  private readonly cookies = new Map<string, string>();

  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {}

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
      throw new BadRequestException('JP Center login failed');
    }
  }

  async fetchAuctionPage(options: {
    vendor: string;
    model: string;
    page: number;
    listSize: number;
    yearFrom?: number;
    yearTo?: number;
  }): Promise<JpCenterPayload> {
    const fields = jpCenterLoaderFields(options);
    const response = await this.request(`/aj_neo?file=loader&ajx=${Date.now()}-form`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: fields,
    });
    const body = await response.text();
    return parseJpCenterLoader(body);
  }

  async fetchAuctionImageUrls(sourceUrl: string) {
    const path = new URL(sourceUrl).pathname;
    const response = await this.request(path);
    return extractJpCenterImageUrls(await response.text());
  }

  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const cookie = Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join('; ');
    if (cookie) {
      headers.set('cookie', cookie);
    }

    const response = await fetch(new URL(path, JP_CENTER_BASE_URL), { ...init, headers });
    this.storeCookies(response.headers);

    if (!response.ok) {
      throw new BadRequestException(`JP Center request failed: ${response.status}`);
    }

    return response;
  }

  private storeCookies(headers: Headers) {
    const setCookies =
      typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
        : splitSetCookie(headers.get('set-cookie'));

    for (const cookie of setCookies) {
      const [pair] = cookie.split(';');
      const [key, value] = pair.split('=');
      if (key && value) {
        this.cookies.set(key.trim(), value.trim());
      }
    }
  }
}

function jpCenterLoaderFields(options: {
  vendor: string;
  model: string;
  page: number;
  listSize: number;
  yearFrom?: number;
  yearTo?: number;
}) {
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
    year: options.yearFrom ? String(options.yearFrom) : '',
    year2: options.yearTo ? String(options.yearTo) : '',
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

function parseJpCenterLoader(body: string): JpCenterPayload {
  const tplMatch = body.match(/'tpl_poisk'\s*:\s*'((?:\\'|[^'])*)'/);
  if (!tplMatch) {
    throw new BadRequestException('JP Center loader did not return auction data');
  }

  const script = tplMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  const normalizedScript = script.replace(/\\"/g, '"');
  const dataMatch = normalizedScript.match(/var\s+data\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!dataMatch) {
    throw new BadRequestException('JP Center auction data is malformed');
  }

  const json = dataMatch[1].replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  return JSON.parse(json) as JpCenterPayload;
}

function splitSetCookie(value: string | null) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,]+=)/);
}

function toNumber(value: string | undefined) {
  return Number.parseInt(value ?? '0', 10) || 0;
}

function cleanText(value: string | undefined) {
  return (value ?? '').trim();
}

function cleanDisplayText(value: string | undefined) {
  return cleanText(value)
    .replace(/[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function selectHighQualityImages(urls: string[], sourceKey: string, publicBaseUrl: string) {
  const highQuality: string[] = [];
  const timestampBase = new Date();

  for (const [index, url] of urls.entries()) {
    const image = await fetchImage(url);
    if (!image || !isUsableVehicleImage(image.dimensions)) {
      continue;
    }

    const localPath = await saveImage(image, sourceKey, timestampBase, index);
    highQuality.push(`${publicBaseUrl.replace(/\/$/, '')}${localPath}`);
  }

  return highQuality.length ? highQuality : [FALLBACK_IMAGE];
}

function imageUrlsFromTokens(tokens: Array<string | undefined>) {
  return tokens
    .map((token) => cleanText(token))
    .filter(Boolean)
    .map((token) => `https://8.ajes.com/imgs/${token}`);
}

function extractJpCenterImageUrls(html: string) {
  const urls = [...html.matchAll(/https?:\/\/(?:\d+\.)?ajes\.com\/imgs\/[^"' <>)]+/g)]
    .map((match) => match[0].replace(/&amp;/g, '&'))
    .map((url) => url.replace(/[?&]w=\d+$/, '').replace(/&w=\d+$/, ''));

  return [...new Set(urls)];
}

async function fetchImage(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = readImageDimensions(buffer);
    if (!dimensions) return null;

    return {
      buffer,
      contentType: response.headers.get('content-type') ?? '',
      dimensions,
      url,
    };
  } catch {
    return null;
  }
}

async function saveImage(
  image: { buffer: Buffer; contentType: string; url: string },
  sourceKey: string,
  timestampBase: Date,
  index: number,
) {
  const imagesDir = resolveApiPath('public/images/jpcenter');
  await mkdir(imagesDir, { recursive: true });

  const extension = imageExtension(image.buffer, image.contentType, image.url);
  const filename = `${sourceKey}_${formatFileTimestamp(addSeconds(timestampBase, index))}${extension}`;
  await writeFile(join(imagesDir, filename), image.buffer);

  return `${LOCAL_IMAGE_ROUTE}/${filename}`;
}

function addSeconds(value: Date, seconds: number) {
  return new Date(value.getTime() + seconds * 1000);
}

function formatFileTimestamp(value: Date) {
  const parts = [
    value.getFullYear().toString().slice(-2),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
    String(value.getHours()).padStart(2, '0'),
    String(value.getMinutes()).padStart(2, '0'),
    String(value.getSeconds()).padStart(2, '0'),
  ];
  return parts.join('');
}

function imageExtension(buffer: Buffer, contentType: string, url: string) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg';
  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return '.png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif';
  if (contentType.includes('jpeg')) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('gif')) return '.gif';
  return extname(new URL(url).pathname) || '.jpg';
}

function resolveApiPath(relativePath: string) {
  const cwdPath = join(process.cwd(), relativePath);
  if (existsSync(join(process.cwd(), 'src'))) return cwdPath;
  return join(process.cwd(), 'apps/api', relativePath);
}

function imageFilePrefix(model: string, lotOrId: string) {
  const modelPart = titleCase(model).replace(/[^a-zA-Z0-9]/g, '') || 'Jpcenter';
  const numericPart = lotOrId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `${modelPart}${numericPart}`;
}

function readImageDimensions(buffer: Buffer) {
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
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + size;
    }
  }

  return null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isUsableVehicleImage(dimensions: { width: number; height: number }) {
  const landscapePhoto = dimensions.width >= MIN_IMAGE_WIDTH && dimensions.height >= MIN_IMAGE_HEIGHT;
  const portraitAuctionSheet = dimensions.width >= MIN_AUCTION_SHEET_WIDTH && dimensions.height >= MIN_AUCTION_SHEET_HEIGHT;
  return landscapePhoto || portraitAuctionSheet;
}

function inferFuelType(model: string) {
  const normalized = model.toLowerCase();
  if (/(prius|aqua|hybrid|insight|leaf|sakura|bz4x)/.test(normalized)) {
    return 'Hybrid';
  }
  return 'Petrol';
}
