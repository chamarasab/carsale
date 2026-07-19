import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as cheerio from 'cheerio';
import { Model } from 'mongoose';
import { extname } from 'node:path';
import { normalizeAuctionGrade } from '../cars/auction-grades';
import { CarsService, colomboDateKey, normalizeAuctionDate } from '../cars/cars.service';
import { CreateCarDto } from '../cars/dto';
import { MediaService } from '../media/media.service';
import { SettingsService } from '../settings/settings.service';
import { WebsiteValuesService } from '../website-values/website-values.service';
import { ScrapeJobResult, ScrapeRun, ScrapeRunDocument, ScrapeRunTrigger } from './scrape-run.schema';

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

type JpCenterBatchJob = JpCenterImportOptions & {
  maker: string;
  model: string;
};

type AutomarketImportOptions = {
  maker: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  listSize?: number;
};

type AutomarketRow = {
  id: string;
  lotNumber: string;
  auctionDate: string;
  auctionName: string;
  maker: string;
  model: string;
  vehicleGrade: string;
  auctionGrade?: string;
  year: number;
  mileageKm: number;
  engineCapacity: number;
  transmission: string;
  color: string;
  modelCode: string;
  equipment: string;
  auctionPriceJpy: number;
  detailPath: string;
  previewImageUrl?: string;
};

const JP_CENTER_BASE_URL = 'https://jpcenter.ru';
const AUTOMARKET_BASE_URL = 'https://auctions.a-automarket.com';
const MIN_IMAGE_WIDTH = 320;
const MIN_IMAGE_HEIGHT = 240;
const MIN_AUCTION_SHEET_WIDTH = 220;
const MIN_AUCTION_SHEET_HEIGHT = 320;
const LOCAL_IMAGE_ROUTE = '/images/jpcenter';
const DEFAULT_BATCH_JOB_DELAY_MS = 2_000;
const DEFAULT_BATCH_JOB_RETRY_DELAY_MS = 5_000;
const DEFAULT_LOGIN_RETRY_DELAY_MS = 15_000;
const DEFAULT_LOGIN_ATTEMPTS = 3;
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
const AUTOMARKET_MAKER_IDS: Record<string, string> = {
  DAIHATSU: '1',
  HONDA: '2',
  MAZDA: '4',
  MITSUBISHI: '5',
  NISSAN: '6',
  SUBARU: '7',
  SUZUKI: '8',
  TOYOTA: '9',
  LEXUS: '59',
};

const DEFAULT_JP_CENTER_JOBS: JpCenterBatchJob[] = [
  { maker: 'Toyota', model: 'Raize', yearFrom: 2023, pages: 1, listSize: 7 },
  { maker: 'Toyota', model: 'Roomy', yearFrom: 2023, pages: 1, listSize: 7 },
  { maker: 'Honda', model: 'Vezel', yearFrom: 2023, pages: 1, listSize: 7 },
  { maker: 'Honda', model: 'N BOX', yearFrom: 2023, pages: 1, listSize: 6 },
  { maker: 'Suzuki', model: 'Wagon R', yearFrom: 2023, pages: 1, listSize: 6 },
  { maker: 'Suzuki', model: 'Spacia', yearFrom: 2023, pages: 1, listSize: 5 },
  { maker: 'Daihatsu', model: 'Taft', yearFrom: 2023, pages: 1, listSize: 5 },
  { maker: 'Daihatsu', model: 'Rocky', yearFrom: 2023, pages: 1, listSize: 5 },
  { maker: 'Daihatsu', model: 'Thor', yearFrom: 2023, pages: 1, listSize: 2 },
];

@Injectable()
export class ScraperService implements OnModuleInit {
  private readonly logger = new Logger(ScraperService.name);
  private isBatchRunning = false;

  constructor(
    private readonly carsService: CarsService,
    private readonly config: ConfigService,
    private readonly mediaService: MediaService,
    private readonly settingsService: SettingsService,
    private readonly websiteValuesService: WebsiteValuesService,
    @InjectModel(ScrapeRun.name) private readonly scrapeRunModel: Model<ScrapeRun>,
  ) {}

  async onModuleInit() {
    await this.scrapeRunModel.updateMany(
      { status: 'running' },
      {
        $set: {
          status: 'interrupted',
          finishedAt: new Date(),
          errors: ['API restarted before the scrape run completed'],
        },
      },
    );
    const cleanup = await this.carsService.removeExpiredScrapedAuctions();
    this.logger.log(
      `[AUCTION CLEANUP] deletedCars=${cleanup.deletedCars} deletedImages=${cleanup.deletedImages} cutoff=${cleanup.cutoffDate}`,
    );
    const gradeCleanup = await this.carsService.sanitizeAuctionGrades();
    this.logger.log(
      `[AUCTION GRADE CLEANUP] normalizedCars=${gradeCleanup.normalizedCars} deletedCars=${gradeCleanup.deletedCars} unpublishedCars=${gradeCleanup.unpublishedCars} deletedImages=${gradeCleanup.deletedImages}`,
    );
  }

  async getBotStatus() {
    const [runs, lastJpCenterRun, lastAutomarketRun] = await Promise.all([
      this.scrapeRunModel.find().sort({ startedAt: -1 }).limit(10).lean(),
      this.scrapeRunModel.findOne({ source: 'JP Center' }).sort({ startedAt: -1 }).lean(),
      this.scrapeRunModel.findOne({ source: 'A-Automarket' }).sort({ startedAt: -1 }).lean(),
    ]);
    return {
      source: 'JP Center',
      sourceUrl: JP_CENTER_BASE_URL,
      enabled: this.config.get<string>('SCRAPER_BOT_ENABLED', 'true') !== 'false',
      running: this.isBatchRunning,
      schedule: this.config.get<string>('SCRAPER_SCHEDULE_LABEL', 'Every 6 hours'),
      configuredJobs: this.batchJobs().map(({ maker, model, pages, listSize, yearFrom, yearTo }) => ({
        maker,
        model,
        pages,
        listSize,
        yearFrom,
        yearTo,
      })),
      lastRun: runs[0] ?? null,
      lastRuns: {
        jpCenter: lastJpCenterRun,
        automarket: lastAutomarketRun,
      },
      runs,
    };
  }

  async startJpCenterBatch(trigger: ScrapeRunTrigger) {
    if (this.isBatchRunning) {
      const current = await this.scrapeRunModel.findOne({ status: 'running' }).sort({ startedAt: -1 }).lean();
      return { started: false, reason: 'A scrape run is already active', runId: current?._id };
    }

    this.isBatchRunning = true;
    let run: ScrapeRunDocument;
    try {
      run = await this.scrapeRunModel.create({
        source: 'JP Center',
        trigger,
        status: 'running',
        startedAt: new Date(),
      });
    } catch (error) {
      this.isBatchRunning = false;
      throw error;
    }

    void this.executeBatch(run)
      .catch((error) => this.recordUnexpectedFailure(run, error))
      .finally(() => {
        this.isBatchRunning = false;
      });
    return { started: true, runId: run._id };
  }

  private async recordUnexpectedFailure(run: ScrapeRunDocument, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    this.logger.error(`[SCRAPE FAILED] run=${run.id}: ${message}`);
    try {
      await this.scrapeRunModel.findByIdAndUpdate(run._id, {
        $set: {
          status: 'failed',
          finishedAt,
          durationMs: finishedAt.getTime() - run.startedAt.getTime(),
        },
        $push: { errors: message },
      });
    } catch (persistenceError) {
      const persistenceMessage =
        persistenceError instanceof Error ? persistenceError.message : String(persistenceError);
      this.logger.error(`[SCRAPE FAILURE SAVE FAILED] run=${run.id}: ${persistenceMessage}`);
    }
  }

  private async executeBatch(run: ScrapeRunDocument) {
    const totals = {
      fetched: 0,
      imported: 0,
      inserted: 0,
      updated: 0,
      failedJobs: 0,
    };
    const jobs: ScrapeJobResult[] = [];
    const errors: string[] = [];
    this.logger.log(`[SCRAPE START] run=${run.id} trigger=${run.trigger}`);
    await this.refreshManufacturerValues();
    const client = await this.createJpCenterClient();
    const jobDelayMs = Math.max(
      0,
      this.config.get<number>('SCRAPER_JOB_DELAY_MS') ?? DEFAULT_BATCH_JOB_DELAY_MS,
    );

    const batchJobs = this.batchJobs();
    for (const [index, job] of batchJobs.entries()) {
      try {
        const result = await this.runJpCenterJob(job, client);
        const jobResult: ScrapeJobResult = {
          maker: job.maker,
          model: job.model,
          fetched: result.fetched,
          imported: result.imported,
          inserted: result.created,
          updated: result.updated,
        };
        jobs.push(jobResult);
        totals.fetched += result.fetched;
        totals.imported += result.imported;
        totals.inserted += result.created;
        totals.updated += result.updated;
        this.logger.log(
          `[SCRAPE JOB] ${job.maker} ${job.model} fetched=${result.fetched} inserted=${result.created} updated=${result.updated}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        jobs.push({
          maker: job.maker,
          model: job.model,
          fetched: 0,
          imported: 0,
          inserted: 0,
          updated: 0,
          error: message,
        });
        totals.failedJobs += 1;
        errors.push(`${job.maker} ${job.model}: ${message}`);
        this.logger.error(`[SCRAPE JOB FAILED] ${job.maker} ${job.model}: ${message}`);
      }

      await this.scrapeRunModel.findByIdAndUpdate(run._id, {
        $set: totals,
        $push: { jobs: jobs[jobs.length - 1] },
      });

      if (jobDelayMs > 0 && index < batchJobs.length - 1) {
        await delay(jobDelayMs);
      }
    }

    const finishedAt = new Date();
    const status = errors.length === 0 ? 'success' : totals.imported > 0 ? 'partial' : 'failed';
    await this.scrapeRunModel.findByIdAndUpdate(run._id, {
      $set: {
        ...totals,
        status,
        errors,
        finishedAt,
        durationMs: finishedAt.getTime() - run.startedAt.getTime(),
      },
    });
    const cleanup = await this.carsService.removeExpiredScrapedAuctions();
    this.logger.log(
      `[SCRAPE COMPLETE] run=${run.id} status=${status} fetched=${totals.fetched} inserted=${totals.inserted} updated=${totals.updated} errors=${errors.length} expiredDeleted=${cleanup.deletedCars}`,
    );
  }

  private batchJobs(): JpCenterBatchJob[] {
    const configured = this.config.get<string>('SCRAPER_JOBS_JSON');
    if (!configured) return DEFAULT_JP_CENTER_JOBS;
    try {
      const jobs = JSON.parse(configured) as JpCenterBatchJob[];
      return Array.isArray(jobs) && jobs.length ? jobs : DEFAULT_JP_CENTER_JOBS;
    } catch {
      this.logger.warn('SCRAPER_JOBS_JSON is invalid; using default JP Center jobs');
      return DEFAULT_JP_CENTER_JOBS;
    }
  }

  private async runJpCenterJob(job: JpCenterBatchJob, batchClient: JpCenterClient) {
    try {
      return await this.importFromJpCenter(job, batchClient);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryDelayMs = Math.max(
        0,
        this.config.get<number>('SCRAPER_JOB_RETRY_DELAY_MS') ?? DEFAULT_BATCH_JOB_RETRY_DELAY_MS,
      );
      this.logger.warn(
        `[SCRAPE JOB RETRY] ${job.maker} ${job.model} after ${retryDelayMs}ms: ${message}`,
      );
      if (retryDelayMs > 0) await delay(retryDelayMs);
      return this.importFromJpCenter(job);
    }
  }

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

  async importFromJpCenter(options: JpCenterImportOptions, authenticatedClient?: JpCenterClient) {
    const username = this.config.get<string>('JPCENTER_USERNAME');
    const password = this.config.get<string>('JPCENTER_PASSWORD');

    if (!username || !password) {
      throw new BadRequestException('JPCENTER_USERNAME and JPCENTER_PASSWORD are required');
    }

    if (!authenticatedClient) await this.refreshManufacturerValues();

    const maker = (options.maker ?? 'Toyota').trim();
    const model = (options.model ?? 'Prius').trim().toUpperCase();
    const vendor = options.vendor ?? JP_CENTER_VENDOR_IDS[maker.toUpperCase()];

    if (!vendor) {
      throw new BadRequestException(`Unsupported JP Center maker: ${maker}`);
    }

    const pages = Math.min(Math.max(options.pages ?? 1, 1), 5);
    const listSize = Math.min(Math.max(options.listSize ?? 20, 1), 50);
    const client = authenticatedClient ?? (await this.createJpCenterClient());

    const imported = [];
    let created = 0;
    let updated = 0;
    let fetched = 0;
    const exchangeRate = await this.settingsService.getJpyToLkrRate();

    for (let page = 1; page <= pages; page += 1) {
      // New auction entries often omit mileage. Search deeper so each job imports
      // complete listings instead of filling its quota with placeholder 0 km cars.
      const sourceListSize = Math.min(Math.max(listSize * 5, 25), 50);
      const payload = await client.fetchAuctionPage({
        vendor,
        model,
        page,
        listSize: sourceListSize,
        yearFrom: options.yearFrom,
        yearTo: options.yearTo,
      });
      const sourceRows = payload.body ?? [];
      const rows = selectCurrentAuctionRows(sourceRows, listSize, colomboDateKey());
      fetched += sourceRows.length;

      for (const row of rows) {
        const dto = await this.toCarDto(row, { maker, model }, client, exchangeRate);
        if (!dto) continue;
        const result = await this.carsService.upsertBySourceUrl(dto);
        imported.push(result.car);
        if (result.created) created += 1;
        else updated += 1;
      }

      if (sourceRows.length < sourceListSize) {
        break;
      }
    }

    return { fetched, imported: imported.length, created, updated, cars: imported };
  }

  private async createJpCenterClient() {
    const username = this.config.get<string>('JPCENTER_USERNAME');
    const password = this.config.get<string>('JPCENTER_PASSWORD');
    if (!username || !password) {
      throw new BadRequestException('JPCENTER_USERNAME and JPCENTER_PASSWORD are required');
    }

    const attempts = Math.max(
      1,
      this.config.get<number>('SCRAPER_LOGIN_ATTEMPTS') ?? DEFAULT_LOGIN_ATTEMPTS,
    );
    const retryDelayMs = Math.max(
      0,
      this.config.get<number>('SCRAPER_LOGIN_RETRY_DELAY_MS') ?? DEFAULT_LOGIN_RETRY_DELAY_MS,
    );
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const client = new JpCenterClient(username, password);
        await client.login();
        return client;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          const waitMs = retryDelayMs * attempt;
          this.logger.warn(`[SCRAPE LOGIN RETRY] attempt=${attempt + 1}/${attempts} waitMs=${waitMs}`);
          if (waitMs > 0) await delay(waitMs);
        }
      }
    }

    throw lastError;
  }

  async runAutomarketImport(options: AutomarketImportOptions) {
    const startedAt = new Date();
    const run = await this.scrapeRunModel.create({
      source: 'A-Automarket',
      trigger: 'manual',
      status: 'running',
      startedAt,
    });

    try {
      await this.refreshManufacturerValues();
      const result = await this.importFromAutomarket(options);
      const finishedAt = new Date();
      const job: ScrapeJobResult = {
        maker: options.maker,
        model: options.model,
        fetched: result.fetched,
        imported: result.imported,
        inserted: result.created,
        updated: result.updated,
      };
      await this.scrapeRunModel.findByIdAndUpdate(run._id, {
        $set: {
          status: 'success',
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          fetched: result.fetched,
          imported: result.imported,
          inserted: result.created,
          updated: result.updated,
          jobs: [job],
        },
      });
      return { ...result, runId: run.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const finishedAt = new Date();
      await this.scrapeRunModel.findByIdAndUpdate(run._id, {
        $set: {
          status: 'failed',
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          failedJobs: 1,
          errors: [message],
        },
      });
      throw error;
    }
  }

  private async importFromAutomarket(options: AutomarketImportOptions) {
    const username = this.config.get<string>('AUTOMARKET_USERNAME')?.trim();
    const password = this.config.get<string>('AUTOMARKET_PASSWORD')?.trim();
    if (!username || !password) {
      throw new BadRequestException('AUTOMARKET_USERNAME and AUTOMARKET_PASSWORD are required');
    }

    const maker = options.maker.trim();
    const model = options.model.trim();
    const makerId = AUTOMARKET_MAKER_IDS[maker.toUpperCase()];
    if (!makerId) throw new BadRequestException(`Unsupported Automarket maker: ${maker}`);
    if (!model) throw new BadRequestException('Automarket model is required');

    const listSize = Math.min(Math.max(options.listSize ?? 5, 1), 10);
    const client = new AutomarketClient(username, password);
    await client.login();
    const rows = await client.fetchAuctionRows({
      makerId,
      model,
      yearFrom: options.yearFrom,
      yearTo: options.yearTo,
    });

    const completeRows = rows
      .filter((row) => row.mileageKm > 0 && row.auctionPriceJpy > 0 && row.auctionGrade)
      .slice(0, listSize);
    let created = 0;
    let updated = 0;
    const cars = [];
    const exchangeRate = await this.settingsService.getJpyToLkrRate();

    for (const row of completeRows) {
      const details = await client.fetchLotImages(row.detailPath);
      const sourceUrl = new URL(row.detailPath, AUTOMARKET_BASE_URL).toString();
      const images = await selectHighQualityImages(
        details.length ? details : row.previewImageUrl ? [row.previewImageUrl] : [],
        imageFilePrefix(row.model, row.lotNumber || row.id),
        this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000',
        this.mediaService,
        '/images/automarket',
      );
      if (!images.length) {
        this.logger.warn(`[AUTOMARKET SKIP] ${sourceUrl} has no usable auction images`);
        continue;
      }

      const engineCapacity = normalizeEngineCapacity(row.engineCapacity, row.modelCode);
      const identity = `${row.model} ${row.modelCode} ${row.vehicleGrade}`;
      const fuelType = inferFuelType(identity);
      const dto: CreateCarDto = {
        title: cleanDisplayText(
          [row.year, titleCase(row.maker), titleCase(row.model), row.vehicleGrade].filter(Boolean).join(' '),
        ),
        maker: titleCase(row.maker),
        model: titleCase(row.model),
        modelCode: row.modelCode,
        vehicleGrade: row.vehicleGrade || undefined,
        year: row.year,
        mileageKm: row.mileageKm,
        fuelType,
        transmission: row.transmission || 'Automatic',
        auctionGrade: row.auctionGrade!,
        chassisCode: row.modelCode || row.lotNumber,
        location: row.auctionName || 'Japan auction',
        auctionDate: row.auctionDate || undefined,
        source: 'A-Automarket',
        sourceUrl,
        images,
        features: [
          row.lotNumber ? `Lot ${row.lotNumber}` : '',
          row.color ? `${titleCase(row.color)} exterior` : '',
          engineCapacity ? `${engineCapacity}cc engine` : '',
          row.vehicleGrade ? `Vehicle grade ${row.vehicleGrade}` : '',
          row.equipment ? `Equipment ${row.equipment}` : '',
        ].filter(Boolean),
        cost: {
          auctionPriceJpy: row.auctionPriceJpy,
          exchangeRateLkr: exchangeRate.rate,
          exchangeRateDate: exchangeRate.date,
          exchangeRateSource: exchangeRate.source,
          exchangeRateProvider: exchangeRate.provider,
          freightJpy: this.config.get<number>('DEFAULT_FREIGHT_JPY') ?? 220000,
          insuranceJpy: this.config.get<number>('DEFAULT_INSURANCE_JPY') ?? 50000,
          vehicleType: 'Car',
          fuelType,
          engineCapacity,
          manufactureYear: row.year,
          bankChargesLkr: this.config.get<number>('DEFAULT_BANK_CHARGES_LKR') ?? 45000,
          clearingChargesLkr: this.config.get<number>('DEFAULT_CLEARING_CHARGES_LKR') ?? 220000,
          importerCommissionLkr: this.config.get<number>('DEFAULT_IMPORTER_COMMISSION_LKR') ?? 220000,
          localTransportLkr: this.config.get<number>('DEFAULT_LOCAL_TRANSPORT_LKR') ?? 95000,
        },
        status: 'available',
        published: true,
      };
      const result = await this.carsService.upsertBySourceUrl(dto);
      cars.push(result.car);
      if (result.created) created += 1;
      else updated += 1;
    }

    return {
      fetched: rows.length,
      eligible: completeRows.length,
      imported: cars.length,
      created,
      updated,
      cars,
    };
  }

  private async refreshManufacturerValues() {
    try {
      await this.websiteValuesService.refreshKnownSources();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[WEBSITE VALUE REFRESH] using cached values: ${message}`);
    }
    try {
      const result = await this.carsService.recalculateAll();
      this.logger.log(`[WEBSITE VALUE RECALCULATION] cars=${result.recalculated}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[WEBSITE VALUE RECALCULATION] skipped: ${message}`);
    }
  }

  private async toCarDto(
    row: JpCenterRow,
    query: { maker: string; model: string },
    client: JpCenterClient,
    exchangeRate: Awaited<ReturnType<SettingsService['getJpyToLkrRate']>>,
  ): Promise<CreateCarDto | null> {
    const year = toNumber(row.g) || new Date().getFullYear();
    const auctionPriceJpy = toNumber(row.t) || toNumber(row.s) || toNumber(row.o) || 0;
    const modelCode = cleanText(row.j);
    const engineCapacity = normalizeEngineCapacity(toNumber(row.h), modelCode);
    const chassisPrefix = cleanText(row.k);
    const auctionGrade = normalizeAuctionGrade(cleanText(row.r));
    const trim = cleanDisplayText(row.l);
    const auctionName = cleanText(row.d) || 'Japan auction';
    const lotNumber = cleanText(row.c);
    const color = cleanDisplayText(row.w);
    const vehicleIdentity = `${query.model} ${modelCode} ${chassisPrefix} ${trim}`;
    const fuelType = inferFuelType(vehicleIdentity);
    const motorPowerKw = inferMotorPowerKw(vehicleIdentity);
    const sourceUrl = `${JP_CENTER_BASE_URL}/${cleanText(row.f1) || 'aj'}-${cleanText(row.a)}.htm`;
    if (!auctionGrade) {
      this.logger.warn(`[SCRAPE SKIP] ${sourceUrl} has no supported auction grade`);
      return null;
    }
    const imagePrefix = imageFilePrefix(query.model, lotNumber || cleanText(row.a));
    let detailImages: string[] = [];
    let detailMileage: number | undefined;
    try {
      const details = await client.fetchAuctionDetails(sourceUrl);
      detailImages = details.imageUrls;
      detailMileage = details.mileageKm;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[SCRAPE DETAIL FALLBACK] ${sourceUrl}: ${message}`);
    }
    const images = await selectHighQualityImages(
      detailImages.length ? detailImages : imageUrlsFromTokens([row.x, row.y, row.z]),
      imagePrefix,
      this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000',
      this.mediaService,
    );
    if (!images.length) {
      this.logger.warn(`[SCRAPE SKIP] ${sourceUrl} has no usable auction images`);
      return null;
    }

    return {
      title: cleanDisplayText([year, titleCase(query.maker), titleCase(query.model), trim].filter(Boolean).join(' ')),
      maker: titleCase(query.maker),
      model: titleCase(query.model),
      modelCode,
      vehicleGrade: trim || undefined,
      year,
      mileageKm: detailMileage ?? toNumber(row.q),
      fuelType,
      transmission: 'Automatic',
      auctionGrade,
      chassisCode: [chassisPrefix, modelCode].filter(Boolean).join(' ') || lotNumber,
      location: auctionName,
      auctionDate: cleanText(row.e) || undefined,
      source: 'JP Center',
      sourceUrl,
      images,
      features: [
        lotNumber ? `Lot ${lotNumber}` : '',
        color ? `${titleCase(color)} exterior` : '',
        engineCapacity ? `${engineCapacity}cc engine` : '',
        trim ? `Vehicle grade ${trim}` : '',
      ].filter(Boolean),
      cost: {
        auctionPriceJpy,
        exchangeRateLkr: exchangeRate.rate,
        exchangeRateDate: exchangeRate.date,
        exchangeRateSource: exchangeRate.source,
        exchangeRateProvider: exchangeRate.provider,
        freightJpy: this.config.get<number>('DEFAULT_FREIGHT_JPY') ?? 220000,
        insuranceJpy: this.config.get<number>('DEFAULT_INSURANCE_JPY') ?? 50000,
        vehicleType: 'Car',
        fuelType,
        engineCapacity,
        motorPowerKw,
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

  async fetchAuctionDetails(sourceUrl: string) {
    const path = new URL(sourceUrl).pathname;
    const response = await this.request(path);
    const html = await response.text();
    return {
      imageUrls: extractJpCenterImageUrls(html),
      mileageKm: extractJpCenterMileage(html),
    };
  }

  private async request(path: string, init: RequestInit = {}) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const headers = new Headers(init.headers);
      const cookie = Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) {
        headers.set('cookie', cookie);
      }

      try {
        const response = await fetch(new URL(path, JP_CENTER_BASE_URL), {
          ...init,
          headers,
          signal: init.signal ?? AbortSignal.timeout(30_000),
        });
        this.storeCookies(response.headers);
        if (response.ok) return response;
        if (response.status < 500 && response.status !== 429) {
          throw new BadRequestException(`JP Center request failed: ${response.status}`);
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        lastError = error;
      }

      if (attempt < 3) {
        await delay(attempt * 750);
      }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new BadRequestException(`JP Center request failed after 3 attempts: ${reason}`);
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

class AutomarketClient {
  private readonly cookies = new Map<string, string>();

  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {}

  async login() {
    const loginPage = await this.request('/');
    const html = await loginPage.text();
    const $ = cheerio.load(html);
    const action = $('form[action*="/auth/login.php"]').first().attr('action');
    if (!action) throw new BadRequestException('Automarket login form was not found');

    const response = await this.request(action, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: this.username,
        password: this.password,
        Submit: 'Sign in',
      }),
    });
    const authenticatedHtml = await response.text();
    if (!authenticatedHtml.includes('/auth/logout.php')) {
      throw new BadRequestException('Automarket login failed');
    }
  }

  async fetchAuctionRows(options: {
    makerId: string;
    model: string;
    yearFrom?: number;
    yearTo?: number;
  }) {
    const query = new URLSearchParams({
      p: 'project/findlots',
      s: '',
      ld: '',
      mrk: options.makerId,
      word: options.model.toUpperCase(),
      year1: options.yearFrom ? String(options.yearFrom) : '',
      year2: options.yearTo ? String(options.yearTo) : '',
      vs: '20',
      pg: '1',
    });
    const response = await this.request(`/auctions?${query}`);
    return parseAutomarketRows(await response.text());
  }

  async fetchLotImages(path: string) {
    const response = await this.request(path);
    return extractAutomarketImageUrls(await response.text());
  }

  private async request(path: string, init: RequestInit = {}) {
    let url = new URL(path, AUTOMARKET_BASE_URL);
    let requestInit = { ...init };

    for (let redirect = 0; redirect < 10; redirect += 1) {
      const headers = new Headers(requestInit.headers);
      const cookie = Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) headers.set('cookie', cookie);
      const response = await fetch(url, {
        ...requestInit,
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      this.storeCookies(response.headers);
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        if (!response.ok) throw new BadRequestException(`Automarket request failed: ${response.status}`);
        return response;
      }

      const location = response.headers.get('location');
      if (!location) throw new BadRequestException('Automarket returned an invalid redirect');
      url = new URL(location, url);
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && requestInit.method === 'POST')) {
        requestInit = { method: 'GET' };
      }
    }
    throw new BadRequestException('Automarket returned too many redirects');
  }

  private storeCookies(headers: Headers) {
    const values =
      typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
        : splitSetCookie(headers.get('set-cookie'));
    for (const value of values) {
      const [pair] = value.split(';');
      const separator = pair.indexOf('=');
      if (separator > 0) this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
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

export function parseAutomarketRows(html: string): AutomarketRow[] {
  const $ = cheerio.load(html);
  const rows: AutomarketRow[] = [];

  $('tr[id^="cell_"]').each((_, element) => {
    const index = ($(element).attr('id') ?? '').replace('cell_', '');
    if (!index) return;
    const text = (selector: string) => cleanDisplayText($(selector).text());
    const detailPath = $(`#bid_number_${index} a`).attr('href') ?? '';
    const id = new URL(detailPath || '/', AUTOMARKET_BASE_URL).searchParams.get('id') ?? '';
    const currency = text(`#currencyLot${index}`);
    const auctionPriceJpy = currency === 'JPY' ? toNumber(text(`#priceLotS${index}`)) * 1000 : 0;
    const previewImageUrl = $(`#photo_${index} img`).attr('load_src')?.replace(/[?&]w=\d+$/, '');

    if (!id || !detailPath) return;
    rows.push({
      id,
      lotNumber: text(`#bid_number_${index}`),
      auctionDate: text(`#date_${index}`).split(' ')[0],
      auctionName: text(`#auction_${index}`),
      maker: text(`#company_${index}`),
      model: text(`#model_${index}`),
      vehicleGrade: text(`#grade_${index}`),
      auctionGrade: normalizeAuctionGrade(text(`#scores_${index}`)),
      year: toNumber(text(`#year_${index}`)),
      mileageKm: toNumber(text(`#mileage_${index}`)),
      engineCapacity: toNumber(text(`#displacement_${index}`)),
      transmission: text(`#transmission_${index}`),
      color: text(`#color_${index}`),
      modelCode: text(`#model_type_${index}`),
      equipment: text(`#equipment_${index}`),
      auctionPriceJpy,
      detailPath,
      previewImageUrl,
    });
  });

  return rows;
}

export function extractAutomarketImageUrls(html: string) {
  const $ = cheerio.load(html);
  return [
    ...new Set(
      $('a[href^="https://i.aleado.ru/pic/"]')
        .map((_, element) => $(element).attr('href'))
        .get()
        .filter((url): url is string => Boolean(url)),
    ),
  ];
}

function splitSetCookie(value: string | null) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,]+=)/);
}

function toNumber(value: string | undefined) {
  return Number.parseInt((value ?? '0').replace(/[^\d]/g, ''), 10) || 0;
}

export function selectRowsWithMileage(rows: JpCenterRow[], limit: number) {
  return rows.filter((row) => toNumber(row.q) > 0).slice(0, limit);
}

export function selectCurrentAuctionRows(rows: JpCenterRow[], limit: number, today: string) {
  return rows
    .filter((row) => {
      const auctionDate = normalizeAuctionDate(row.e);
      return toNumber(row.q) > 0 && auctionDate !== undefined && auctionDate >= today;
    })
    .slice(0, limit);
}

function cleanText(value: string | undefined) {
  return (value ?? '').trim();
}

export function normalizeEngineCapacity(engineCapacity: number, modelCode: string) {
  if (engineCapacity === 1_000 && /^(?:M9[01]0|A2(?:00|01|10))/i.test(modelCode)) return 996;
  if (engineCapacity === 1_200 && /^A202/i.test(modelCode)) return 1_196;
  return engineCapacity;
}

export function cleanDisplayText(value: string | undefined) {
  const text = cleanText(value);
  const invalidSuffix = text.search(/&#(?:\d+|x[\da-f]+);|[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/i);

  return (invalidSuffix >= 0 ? text.slice(0, invalidSuffix) : text)
    .replace(/\s+/g, ' ')
    .trim();
}

async function selectHighQualityImages(
  urls: string[],
  sourceKey: string,
  publicBaseUrl: string,
  mediaService: MediaService,
  localRoute = LOCAL_IMAGE_ROUTE,
) {
  const highQuality: Array<NonNullable<Awaited<ReturnType<typeof fetchImage>>>> = [];
  const timestampBase = new Date();

  for (const url of urls) {
    const image = await fetchImage(url);
    if (!image || !isUsableVehicleImage(image.dimensions)) {
      continue;
    }

    highQuality.push(image);
  }

  const orderedImages = highQuality.sort((left, right) => imageDisplayRank(left) - imageDisplayRank(right));

  return Promise.all(
    orderedImages.map((image, index) => saveImage(image, sourceKey, timestampBase, index, localRoute, mediaService)),
  );
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

export function extractJpCenterMileage(html: string) {
  const match = html.match(/<nobr[^>]*>\s*([\d\s,.]+)\s*(?:km|км)\s*<\/nobr>/i);
  if (!match) return undefined;
  const value = Number.parseInt(match[1].replace(/[^\d]/g, ''), 10);
  return Number.isFinite(value) ? value : undefined;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
  image: { buffer: Buffer; contentType: string; url: string; dimensions: { width: number; height: number } },
  sourceKey: string,
  timestampBase: Date,
  index: number,
  localRoute: string,
  mediaService: MediaService,
) {
  const extension = imageExtension(image.buffer, image.contentType, image.url);
  const filename = `${sourceKey}_${formatFileTimestamp(addSeconds(timestampBase, index))}${extension}`;

  return mediaService.saveImage({
    buffer: image.buffer,
    contentType: image.contentType,
    filename,
    source: localRoute.includes('automarket') ? 'A-Automarket' : 'JP Center',
    sourceUrl: image.url,
    width: image.dimensions.width,
    height: image.dimensions.height,
    imageKind: isLikelyAuctionSheet(image) ? 'auction-sheet' : 'vehicle-photo',
  });
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

function imageDisplayRank(image: { url: string; dimensions: { width: number; height: number } }) {
  return isLikelyAuctionSheet(image) ? 1 : 0;
}

function isLikelyAuctionSheet(image: { url: string; dimensions: { width: number; height: number } }) {
  return isAutomarketAuctionSheetUrl(image.url) || image.dimensions.height > image.dimensions.width * 1.15;
}

export function isAutomarketAuctionSheetUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname === 'i.aleado.ru'
      && url.pathname === '/pic/'
      && url.searchParams.get('system') === 'auto'
      && url.searchParams.get('number') === '0'
    );
  } catch {
    return false;
  }
}

function inferFuelType(model: string) {
  const normalized = model.toLowerCase();
  if (/a202a|e-smart|e smart/.test(normalized)) {
    return 'e-SMART Hybrid';
  }
  if (/e-power|e power/.test(normalized)) {
    return 'e-POWER Hybrid';
  }
  if (/(prius|aqua|hybrid|insight|e:?hev|(?:^|[\s:_-])hev(?:$|[\s:_-])|g[_-]?hev|a202s)/.test(normalized)) {
    return 'Hybrid';
  }
  if (/(leaf|sakura|bz4x)/.test(normalized)) return 'Electric';
  return 'Petrol';
}

function inferMotorPowerKw(vehicleIdentity: string) {
  return /a202a|a202s/i.test(vehicleIdentity) ? 78 : undefined;
}
