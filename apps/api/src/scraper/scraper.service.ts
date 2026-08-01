import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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

type AutomarketImportOptions = {
  maker: string;
  model?: string;
  lotId?: string;
  auctionGrade?: string;
  yearFrom?: number;
  yearTo?: number;
  listSize?: number;
  allUpcoming?: boolean;
};

export type AutomarketBatchJob = AutomarketImportOptions & {
  maker: string;
  model: string;
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

type AutomarketLotDetails = {
  averagePriceJpy: number;
  imageUrls: string[];
};

type AutomarketProgress = {
  phase: 'searching' | 'importing';
  fetched: number;
  eligible: number;
  imported: number;
  inserted: number;
  updated: number;
  failedJobs: number;
};

type AutomarketProgressCallback = (progress: AutomarketProgress, error?: string) => Promise<void>;

const JP_CENTER_BASE_URL = 'https://jpcenter.ru';
const AUTOMARKET_BASE_URL = 'https://auctions.a-automarket.com';
const AUTOMARKET_ORIGIN = new URL(AUTOMARKET_BASE_URL).origin;
const MIN_IMAGE_WIDTH = 320;
const MIN_IMAGE_HEIGHT = 240;
const MIN_AUCTION_SHEET_WIDTH = 220;
const MIN_AUCTION_SHEET_HEIGHT = 320;
const MAX_AUCTION_IMAGES_PER_CAR = 16;
const MAX_AUCTION_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_AUCTION_IMAGE_PIXELS = 50_000_000;
const LOCAL_IMAGE_ROUTE = '/images/jpcenter';
const DEFAULT_BATCH_JOB_DELAY_MS = 2_000;
const DEFAULT_BATCH_JOB_RETRY_DELAY_MS = 5_000;
const DEFAULT_LOGIN_RETRY_DELAY_MS = 15_000;
const DEFAULT_LOGIN_ATTEMPTS = 3;
const DEFAULT_SCRAPER_INTERVAL_MS = 6 * 60 * 60 * 1_000;
const DEFAULT_SCHEDULER_INITIAL_DELAY_MS = 15_000;
const DEFAULT_SCHEDULER_POLL_MS = 5 * 60 * 1_000;
const AUTOMARKET_PAGE_SIZE = 20;
const MAX_AUTOMARKET_PAGES = 100;
const AUTOMARKET_REQUEST_ATTEMPTS = 4;
const AUTOMARKET_PAGE_DELAY_MS = 250;
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
  'ALL MAKERS': '-1',
  DAIHATSU: '1',
  HINO: '30',
  HONDA: '2',
  ISUZU: '3',
  LEXUS: '59',
  MAZDA: '4',
  MITSUBISHI: '5',
  MITSUOKA: '34',
  NISSAN: '6',
  'NISSAN DIESEL (UD)': '113',
  SUBARU: '7',
  SUZUKI: '8',
  TOYOTA: '9',
  AUDI: '13',
  BMW: '12',
  'BMW ALPINA': '44',
  'MERCEDES BENZ': '11',
  OPEL: '15',
  PORSCHE: '32',
  SMART: '73',
  VOLKSWAGEN: '14',
  BUICK: '45',
  CADILLAC: '46',
  CHEVROLET: '36',
  CHRYSLER: '19',
  DODGE: '51',
  FORD: '20',
  GMC: '18',
  HUMMER: '55',
  INFINITI: '75',
  JEEP: '48',
  LINCOLN: '60',
  MERCURY: '65',
  PONTIAC: '70',
  TESLA: '112',
  'ALFA ROMEO': '21',
  FERRARI: '31',
  FIAT: '22',
  LAMBORGHINI: '57',
  LANCIA: '58',
  MASERATI: '62',
  CITROEN: '23',
  PEUGEOT: '24',
  RENAULT: '25',
  SAAB: '29',
  VOLVO: '16',
  HYUNDAI: '37',
  BYD: '117',
  'ASTON MARTIN': '41',
  BENTLEY: '43',
  DAIMLER: '111',
  JAGUAR: '38',
  'LAND ROVER': '17',
  LOTUS: '61',
  MCLAREN: '115',
  MG: '66',
  MINI: '67',
  'ROLLS ROYCE': '71',
  ROVER: '79',
  TVR: '76',
};

export const DEFAULT_AUTOMARKET_JOBS: AutomarketBatchJob[] = [
  { maker: 'Toyota', model: 'Raize', yearFrom: 2023, listSize: 7 },
  { maker: 'Toyota', model: 'Roomy', yearFrom: 2023, listSize: 7 },
  { maker: 'Honda', model: 'Vezel', yearFrom: 2023, listSize: 7 },
  { maker: 'Honda', model: 'N BOX', yearFrom: 2023, listSize: 6 },
  { maker: 'Suzuki', model: 'Wagon R', yearFrom: 2023, listSize: 6 },
  { maker: 'Suzuki', model: 'Spacia', yearFrom: 2023, listSize: 5 },
  { maker: 'Daihatsu', model: 'Taft', yearFrom: 2023, listSize: 5 },
  { maker: 'Daihatsu', model: 'Rocky', yearFrom: 2023, listSize: 5 },
  { maker: 'Daihatsu', model: 'Thor', yearFrom: 2023, listSize: 2 },
  { maker: 'Mercedes Benz', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'BMW', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'Audi', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'Land Rover', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'Volkswagen', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'Volvo', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'Mini', model: '', yearFrom: 2023, listSize: 10 },
  { maker: 'Porsche', model: '', yearFrom: 2023, listSize: 10 },
];

export function parseAutomarketBatchJobs(configured?: string): AutomarketBatchJob[] {
  if (!configured) return DEFAULT_AUTOMARKET_JOBS;

  const parsed = JSON.parse(configured) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('at least one configured search is required');
  }

  return parsed.map((value, index) => {
    if (!value || typeof value !== 'object') {
      throw new Error(`search ${index + 1} must be an object`);
    }

    const job = value as Record<string, unknown>;
    const maker = typeof job.maker === 'string' ? job.maker.trim() : '';
    const model = typeof job.model === 'string' ? job.model.trim() : '';
    if (!maker || !AUTOMARKET_MAKER_IDS[maker.toUpperCase()]) {
      throw new Error(`search ${index + 1} has an unsupported maker`);
    }
    const allUpcoming = job.allUpcoming === true;
    const auctionGradeValue = typeof job.auctionGrade === 'string' ? job.auctionGrade : undefined;
    const auctionGrade = auctionGradeValue
      ? normalizeAuctionGrade(auctionGradeValue)
      : undefined;
    if (auctionGradeValue && !auctionGrade) {
      throw new Error(`search ${index + 1} has an unsupported auction grade`);
    }

    return {
      maker,
      model,
      auctionGrade,
      yearFrom: optionalAutomarketYear(job.yearFrom, index),
      yearTo: optionalAutomarketYear(job.yearTo, index),
      listSize: allUpcoming ? undefined : boundedAutomarketLimit(job.listSize),
      allUpcoming,
    };
  });
}

function optionalAutomarketYear(value: unknown, index: number) {
  if (value === undefined || value === null || value === '') return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1980 || year > 2100) {
    throw new Error(`search ${index + 1} has an invalid year`);
  }
  return year;
}

function boundedAutomarketLimit(value: unknown) {
  const limit = Number(value ?? 5);
  if (!Number.isInteger(limit)) return 5;
  return Math.min(Math.max(limit, 1), 10);
}

function positiveMilliseconds(value: unknown, fallback: number) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : fallback;
}

export function scheduledScrapeDueAt(
  lastRun: { startedAt?: Date | string | null } | null | undefined,
  intervalMs = DEFAULT_SCRAPER_INTERVAL_MS,
) {
  if (!lastRun?.startedAt) return undefined;
  const startedAt = new Date(lastRun.startedAt).getTime();
  if (!Number.isFinite(startedAt)) return undefined;
  return new Date(startedAt + positiveMilliseconds(intervalMs, DEFAULT_SCRAPER_INTERVAL_MS));
}

export function isScheduledScrapeDue(
  lastRun: { startedAt?: Date | string | null } | null | undefined,
  now = new Date(),
  intervalMs = DEFAULT_SCRAPER_INTERVAL_MS,
) {
  const dueAt = scheduledScrapeDueAt(lastRun, intervalMs);
  return !dueAt || dueAt.getTime() <= now.getTime();
}

@Injectable()
export class ScraperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScraperService.name);
  private isBatchRunning = false;
  private isAutomarketRunning = false;
  private schedulerCheckRunning = false;
  private schedulerInitialTimer?: NodeJS.Timeout;
  private schedulerPollTimer?: NodeJS.Timeout;

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
    try {
      const duplicateCleanup = await this.carsService.removeDuplicateScrapedAuctions();
      this.logger.log(
        `[AUCTION DUPLICATE CLEANUP] groups=${duplicateCleanup.duplicateGroups} deletedCars=${duplicateCleanup.deletedCars} deletedImages=${duplicateCleanup.deletedImages}`,
      );
    } catch (error) {
      this.logger.error(`[AUCTION DUPLICATE CLEANUP FAILED] ${errorDetail(error)}`);
    }
    this.startInProcessScheduler();
  }

  onModuleDestroy() {
    if (this.schedulerInitialTimer) clearTimeout(this.schedulerInitialTimer);
    if (this.schedulerPollTimer) clearInterval(this.schedulerPollTimer);
  }

  async getBotStatus() {
    const [runs, lastJpCenterRun, lastAutomarketRun, lastScheduledRun, missingWebsiteValues] = await Promise.all([
      this.scrapeRunModel.find().sort({ startedAt: -1 }).limit(10).lean(),
      this.scrapeRunModel.findOne({ source: 'JP Center' }).sort({ startedAt: -1 }).lean(),
      this.scrapeRunModel.findOne({ source: 'A-Automarket' }).sort({ startedAt: -1 }).lean(),
      this.scrapeRunModel
        .findOne({ source: 'A-Automarket', trigger: 'scheduled' })
        .sort({ startedAt: -1 })
        .lean(),
      this.websiteValuesService.countMissing(),
    ]);
    const intervalMs = this.schedulerIntervalMs();
    const nextDueAt = scheduledScrapeDueAt(lastScheduledRun, intervalMs);
    const running = this.isBatchRunning || this.isAutomarketRunning;
    return {
      source: 'A-Automarket',
      sourceUrl: AUTOMARKET_BASE_URL,
      enabled: this.scraperBotEnabled(),
      running,
      schedule: this.config.get<string>('SCRAPER_SCHEDULE_LABEL', 'Every 6 hours'),
      scheduler: {
        inProcessEnabled: this.inProcessSchedulerEnabled(),
        intervalMs,
        pollIntervalMs: this.schedulerPollMs(),
        lastScheduledRunAt: lastScheduledRun?.startedAt ?? null,
        nextDueAt: nextDueAt ?? null,
        overdue:
          this.inProcessSchedulerEnabled()
          && !running
          && isScheduledScrapeDue(lastScheduledRun, new Date(), intervalMs),
      },
      configuredJobs: this.automarketBatchJobs().map(({
        maker,
        model,
        listSize,
        yearFrom,
        yearTo,
        auctionGrade,
        allUpcoming,
      }) => ({
        maker,
        model,
        listSize,
        yearFrom,
        yearTo,
        auctionGrade,
        allUpcoming,
      })),
      lastRun: runs[0] ?? null,
      lastRuns: {
        jpCenter: lastJpCenterRun,
        automarket: lastAutomarketRun,
      },
      missingWebsiteValues,
      runs,
    };
  }

  async startAutomarketBatch(trigger: ScrapeRunTrigger) {
    if (
      trigger === 'scheduled'
      && !this.scraperBotEnabled()
    ) {
      return { started: false, reason: 'Scheduled scraper is disabled' };
    }

    if (this.isBatchRunning || this.isAutomarketRunning) {
      const current = await this.scrapeRunModel.findOne({ status: 'running' }).sort({ startedAt: -1 }).lean();
      return { started: false, reason: 'A scrape run is already active', runId: current?._id };
    }

    this.isBatchRunning = true;
    let run: ScrapeRunDocument;
    try {
      run = await this.scrapeRunModel.create({
        source: 'A-Automarket',
        trigger,
        status: 'running',
        phase: 'preparing configured searches',
        startedAt: new Date(),
      });
    } catch (error) {
      this.isBatchRunning = false;
      throw error;
    }

    void this.executeAutomarketBatch(run)
      .catch((error) => this.recordUnexpectedFailure(run, error))
      .finally(() => {
        this.isBatchRunning = false;
      });
    return { started: true, runId: run._id };
  }

  private startInProcessScheduler() {
    if (!this.inProcessSchedulerEnabled()) {
      this.logger.log('[SCRAPER SCHEDULER] In-process catch-up scheduler is disabled');
      return;
    }

    const initialDelayMs = this.schedulerInitialDelayMs();
    const pollIntervalMs = this.schedulerPollMs();
    this.logger.log(
      `[SCRAPER SCHEDULER] Catch-up enabled intervalMs=${this.schedulerIntervalMs()} pollMs=${pollIntervalMs} initialDelayMs=${initialDelayMs}`,
    );

    this.schedulerInitialTimer = setTimeout(() => {
      this.schedulerInitialTimer = undefined;
      void this.runScheduledScrapeIfDue();
    }, initialDelayMs);
    this.schedulerInitialTimer.unref();

    this.schedulerPollTimer = setInterval(() => {
      void this.runScheduledScrapeIfDue();
    }, pollIntervalMs);
    this.schedulerPollTimer.unref();
  }

  private async runScheduledScrapeIfDue() {
    if (
      !this.inProcessSchedulerEnabled()
      || this.schedulerCheckRunning
      || this.isBatchRunning
      || this.isAutomarketRunning
    ) {
      return;
    }

    this.schedulerCheckRunning = true;
    try {
      const lastScheduledRun = await this.scrapeRunModel
        .findOne({ source: 'A-Automarket', trigger: 'scheduled' })
        .sort({ startedAt: -1 })
        .lean();
      const intervalMs = this.schedulerIntervalMs();
      if (!isScheduledScrapeDue(lastScheduledRun, new Date(), intervalMs)) return;

      const dueAt = scheduledScrapeDueAt(lastScheduledRun, intervalMs);
      this.logger.warn(
        `[SCRAPER SCHEDULER] Scheduled run is due${dueAt ? ` since ${dueAt.toISOString()}` : ''}; starting catch-up`,
      );
      const result = await this.startAutomarketBatch('scheduled');
      if (!result.started) {
        this.logger.log(`[SCRAPER SCHEDULER] Catch-up not started: ${result.reason}`);
      }
    } catch (error) {
      this.logger.error(`[SCRAPER SCHEDULER FAILED] ${errorDetail(error)}`);
    } finally {
      this.schedulerCheckRunning = false;
    }
  }

  private scraperBotEnabled() {
    return this.config.get<string>('SCRAPER_BOT_ENABLED', 'true').trim().toLowerCase() !== 'false';
  }

  private inProcessSchedulerEnabled() {
    if (!this.scraperBotEnabled()) return false;
    return this.config
      .get<string>('SCRAPER_IN_PROCESS_SCHEDULER_ENABLED', 'true')
      .trim()
      .toLowerCase() !== 'false';
  }

  private schedulerIntervalMs() {
    return positiveMilliseconds(
      this.config.get<string>('SCRAPER_INTERVAL_MS'),
      DEFAULT_SCRAPER_INTERVAL_MS,
    );
  }

  private schedulerInitialDelayMs() {
    return positiveMilliseconds(
      this.config.get<string>('SCRAPER_SCHEDULER_INITIAL_DELAY_MS'),
      DEFAULT_SCHEDULER_INITIAL_DELAY_MS,
    );
  }

  private schedulerPollMs() {
    return positiveMilliseconds(
      this.config.get<string>('SCRAPER_SCHEDULER_POLL_MS'),
      DEFAULT_SCHEDULER_POLL_MS,
    );
  }

  private async recordUnexpectedFailure(run: ScrapeRunDocument, error: unknown) {
    const message = errorDetail(error);
    const finishedAt = new Date();
    this.logger.error(`[SCRAPE FAILED] run=${run.id}: ${message}`);
    try {
      await this.scrapeRunModel.findByIdAndUpdate(run._id, {
        $set: {
          status: 'failed',
          phase: 'failed',
          finishedAt,
          durationMs: finishedAt.getTime() - run.startedAt.getTime(),
        },
        $inc: { failedJobs: 1 },
        $push: { errors: message },
      });
    } catch (persistenceError) {
      const persistenceMessage =
        persistenceError instanceof Error ? persistenceError.message : String(persistenceError);
      this.logger.error(`[SCRAPE FAILURE SAVE FAILED] run=${run.id}: ${persistenceMessage}`);
    }
  }

  private async executeAutomarketBatch(run: ScrapeRunDocument) {
    const totals = {
      fetched: 0,
      eligible: 0,
      imported: 0,
      inserted: 0,
      updated: 0,
      failedJobs: 0,
    };
    const jobs: ScrapeJobResult[] = [];
    const errors: string[] = [];
    this.logger.log(`[AUTOMARKET BATCH START] run=${run.id} trigger=${run.trigger}`);
    await this.prepareManufacturerValueCache();
    let client = await this.createAutomarketClient();
    const jobDelayMs = Math.max(
      0,
      this.config.get<number>('SCRAPER_JOB_DELAY_MS') ?? DEFAULT_BATCH_JOB_DELAY_MS,
    );

    const batchJobs = this.automarketBatchJobs();
    for (const [index, job] of batchJobs.entries()) {
      const startingTotals = { ...totals };
      try {
        const progress: AutomarketProgressCallback = async (current) => {
          await this.scrapeRunModel.findByIdAndUpdate(run._id, {
            $set: {
              phase: `${current.phase}: ${job.maker} ${job.model}`,
              fetched: startingTotals.fetched + current.fetched,
              eligible: startingTotals.eligible + current.eligible,
              imported: startingTotals.imported + current.imported,
              inserted: startingTotals.inserted + current.inserted,
              updated: startingTotals.updated + current.updated,
              failedJobs: startingTotals.failedJobs + current.failedJobs,
            },
          });
        };
        const outcome = await this.runAutomarketBatchJob(job, client, progress);
        client = outcome.client;
        const { result } = outcome;
        const jobResult: ScrapeJobResult = {
          maker: job.maker,
          model: job.model,
          fetched: result.fetched,
          imported: result.imported,
          inserted: result.created,
          updated: result.updated,
          error: result.errors.length ? `${result.errors.length} listing(s) skipped` : undefined,
        };
        jobs.push(jobResult);
        totals.fetched += result.fetched;
        totals.eligible += result.eligible;
        totals.imported += result.imported;
        totals.inserted += result.created;
        totals.updated += result.updated;
        totals.failedJobs += result.failedJobs;
        errors.push(...result.errors.map((message) => `${job.maker} ${job.model}: ${message}`));
        this.logger.log(
          `[AUTOMARKET BATCH JOB] ${job.maker} ${job.model} fetched=${result.fetched} eligible=${result.eligible} inserted=${result.created} updated=${result.updated} skipped=${result.failedJobs}`,
        );
      } catch (error) {
        const message = errorDetail(error);
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
        this.logger.error(`[AUTOMARKET BATCH JOB FAILED] ${job.maker} ${job.model}: ${message}`);
      }

      await this.scrapeRunModel.findByIdAndUpdate(run._id, {
        $set: {
          ...totals,
          phase: index < batchJobs.length - 1
            ? `waiting for search ${index + 2} of ${batchJobs.length}`
            : 'checking expired and duplicate auctions',
        },
        $push: { jobs: jobs[jobs.length - 1] },
      });

      if (jobDelayMs > 0 && index < batchJobs.length - 1) {
        await delay(jobDelayMs);
      }
    }

    await this.scrapeRunModel.findByIdAndUpdate(run._id, {
      $set: { phase: 'checking expired and duplicate auctions' },
    });
    const cleanup = await this.carsService.removeExpiredScrapedAuctions();
    let duplicateCleanup = { duplicateGroups: 0, deletedCars: 0, deletedImages: 0 };
    try {
      duplicateCleanup = await this.carsService.removeDuplicateScrapedAuctions();
    } catch (error) {
      const message = `Duplicate cleanup: ${errorDetail(error)}`;
      errors.push(message);
      totals.failedJobs += 1;
      this.logger.error(`[AUCTION DUPLICATE CLEANUP FAILED] run=${run.id}: ${message}`);
    }

    const finishedAt = new Date();
    const status = errors.length === 0 ? 'success' : totals.imported > 0 ? 'partial' : 'failed';
    await this.scrapeRunModel.findByIdAndUpdate(run._id, {
      $set: {
        ...totals,
        status,
        phase: status === 'partial' ? 'completed with errors' : status === 'failed' ? 'failed' : 'complete',
        errors,
        duplicateGroups: duplicateCleanup.duplicateGroups,
        duplicatesDeleted: duplicateCleanup.deletedCars,
        duplicateImagesDeleted: duplicateCleanup.deletedImages,
        finishedAt,
        durationMs: finishedAt.getTime() - run.startedAt.getTime(),
      },
    });
    this.logger.log(
      `[AUTOMARKET BATCH COMPLETE] run=${run.id} status=${status} fetched=${totals.fetched} eligible=${totals.eligible} inserted=${totals.inserted} updated=${totals.updated} errors=${errors.length} expiredDeleted=${cleanup.deletedCars} duplicatesDeleted=${duplicateCleanup.deletedCars} duplicateImagesDeleted=${duplicateCleanup.deletedImages}`,
    );
  }

  private automarketBatchJobs(): AutomarketBatchJob[] {
    const configured = this.config.get<string>('SCRAPER_JOBS_JSON');
    if (!configured) return DEFAULT_AUTOMARKET_JOBS;
    try {
      return parseAutomarketBatchJobs(configured);
    } catch (error) {
      this.logger.warn(
        `SCRAPER_JOBS_JSON is invalid; using default A-Automarket jobs: ${errorDetail(error)}`,
      );
      return DEFAULT_AUTOMARKET_JOBS;
    }
  }

  private async runAutomarketBatchJob(
    job: AutomarketBatchJob,
    batchClient: AutomarketClient,
    onProgress: AutomarketProgressCallback,
  ) {
    try {
      return {
        result: await this.importFromAutomarket(job, onProgress, batchClient),
        client: batchClient,
      };
    } catch (error) {
      const message = errorDetail(error);
      const retryDelayMs = Math.max(
        0,
        this.config.get<number>('SCRAPER_JOB_RETRY_DELAY_MS') ?? DEFAULT_BATCH_JOB_RETRY_DELAY_MS,
      );
      this.logger.warn(
        `[AUTOMARKET BATCH JOB RETRY] ${job.maker} ${job.model} after ${retryDelayMs}ms: ${message}`,
      );
      if (retryDelayMs > 0) await delay(retryDelayMs);
      const client = await this.createAutomarketClient();
      return {
        result: await this.importFromAutomarket(job, onProgress, client),
        client,
      };
    }
  }

  async importFromJpCenter(options: JpCenterImportOptions, authenticatedClient?: JpCenterClient) {
    const username = this.config.get<string>('JPCENTER_USERNAME');
    const password = this.config.get<string>('JPCENTER_PASSWORD');

    if (!username || !password) {
      throw new BadRequestException('JPCENTER_USERNAME and JPCENTER_PASSWORD are required');
    }

    if (!authenticatedClient) await this.prepareManufacturerValueCache();

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

  private async createAutomarketClient() {
    const username = this.config.get<string>('AUTOMARKET_USERNAME')?.trim();
    const password = this.config.get<string>('AUTOMARKET_PASSWORD')?.trim();
    if (!username || !password) {
      throw new BadRequestException('AUTOMARKET_USERNAME and AUTOMARKET_PASSWORD are required');
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
        const client = new AutomarketClient(username, password);
        await client.login();
        return client;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          const waitMs = retryDelayMs * attempt;
          this.logger.warn(
            `[AUTOMARKET LOGIN RETRY] attempt=${attempt + 1}/${attempts} waitMs=${waitMs}`,
          );
          if (waitMs > 0) await delay(waitMs);
        }
      }
    }

    throw lastError;
  }

  async startAutomarketImport(options: AutomarketImportOptions) {
    if (this.isBatchRunning || this.isAutomarketRunning) {
      const current = await this.scrapeRunModel.findOne({ status: 'running' }).sort({ startedAt: -1 }).lean();
      return { started: false, reason: 'A scrape run is already active', runId: current?._id };
    }

    this.isAutomarketRunning = true;
    const startedAt = new Date();
    let run: ScrapeRunDocument;
    try {
      run = await this.scrapeRunModel.create({
        source: 'A-Automarket',
        trigger: 'manual',
        status: 'running',
        phase: 'preparing',
        startedAt,
      });
    } catch (error) {
      this.isAutomarketRunning = false;
      throw error;
    }

    void this.executeAutomarketImport(run, options)
      .catch((error) => this.recordUnexpectedFailure(run, error))
      .finally(() => {
        this.isAutomarketRunning = false;
      });

    return { started: true, runId: run._id };
  }

  private async executeAutomarketImport(run: ScrapeRunDocument, options: AutomarketImportOptions) {
    this.logger.log(
      `[AUTOMARKET START] run=${run.id} maker=${options.maker} model=${options.model || 'all'} lot=${options.lotId || 'search'} allUpcoming=${options.allUpcoming === true}`,
    );
    await this.prepareManufacturerValueCache();
    const result = await this.importFromAutomarket(options, async (progress, error) => {
      const update: Record<string, unknown> = { $set: progress };
      if (error) update.$push = { errors: error };
      await this.scrapeRunModel.findByIdAndUpdate(run._id, update);
    });
    await this.scrapeRunModel.findByIdAndUpdate(run._id, { $set: { phase: 'checking duplicates' } });
    const errors = [...result.errors];
    let failedJobs = result.failedJobs;
    let duplicateCleanup = { duplicateGroups: 0, deletedCars: 0, deletedImages: 0 };
    try {
      duplicateCleanup = await this.carsService.removeDuplicateScrapedAuctions();
    } catch (error) {
      const message = `Duplicate cleanup: ${errorDetail(error)}`;
      errors.push(message);
      failedJobs += 1;
      this.logger.error(`[AUCTION DUPLICATE CLEANUP FAILED] run=${run.id}: ${message}`);
    }

    const finishedAt = new Date();
    const status = errors.length === 0 ? 'success' : result.imported > 0 ? 'partial' : 'failed';
    const job: ScrapeJobResult = {
      maker: options.maker,
      model: options.model ?? '',
      fetched: result.fetched,
      imported: result.imported,
      inserted: result.created,
      updated: result.updated,
      error: result.errors.length ? `${result.errors.length} listing(s) skipped` : undefined,
    };
    await this.scrapeRunModel.findByIdAndUpdate(run._id, {
      $set: {
        status,
        phase: status === 'partial' ? 'completed with skips' : status === 'failed' ? 'failed' : 'complete',
        finishedAt,
        durationMs: finishedAt.getTime() - run.startedAt.getTime(),
        fetched: result.fetched,
        eligible: result.eligible,
        imported: result.imported,
        inserted: result.created,
        updated: result.updated,
        failedJobs,
        errors,
        duplicateGroups: duplicateCleanup.duplicateGroups,
        duplicatesDeleted: duplicateCleanup.deletedCars,
        duplicateImagesDeleted: duplicateCleanup.deletedImages,
        jobs: [job],
      },
    });
    this.logger.log(
      `[AUTOMARKET COMPLETE] run=${run.id} status=${status} fetched=${result.fetched} eligible=${result.eligible} inserted=${result.created} updated=${result.updated} skipped=${result.failedJobs} duplicatesDeleted=${duplicateCleanup.deletedCars} duplicateImagesDeleted=${duplicateCleanup.deletedImages}`,
    );
  }

  private async importFromAutomarket(
    options: AutomarketImportOptions,
    onProgress?: AutomarketProgressCallback,
    authenticatedClient?: AutomarketClient,
  ) {
    const maker = options.maker.trim();
    const model = options.model?.trim() ?? '';
    const targetLotId = options.lotId?.trim();
    const makerId = AUTOMARKET_MAKER_IDS[maker.toUpperCase()];
    if (!makerId) throw new BadRequestException(`Unsupported Automarket maker: ${maker}`);

    const allUpcoming = options.allUpcoming === true;
    const listSize = targetLotId
      ? 1
      : allUpcoming
        ? undefined
        : Math.min(Math.max(options.listSize ?? 5, 1), 10);
    const preferredAuctionGrade = options.auctionGrade
      ? normalizeAuctionGrade(options.auctionGrade)
      : undefined;
    if (options.auctionGrade && !preferredAuctionGrade) {
      throw new BadRequestException(`Unsupported auction grade: ${options.auctionGrade}`);
    }
    const client = authenticatedClient ?? (await this.createAutomarketClient());
    const rows: AutomarketRow[] = [];
    const seenLotIds = new Set<string>();
    const today = colomboDateKey();
    let completeRows: AutomarketRow[] = [];
    let created = 0;
    let updated = 0;
    let failedJobs = 0;
    const cars = [];
    const errors: string[] = [];
    let targetLotFound = false;
    const reportProgress = (phase: AutomarketProgress['phase'], error?: string) => onProgress?.({
      phase,
      fetched: rows.length,
      eligible: completeRows.length,
      imported: cars.length,
      inserted: created,
      updated,
      failedJobs,
    }, error);

    for (let page = 1; page <= MAX_AUTOMARKET_PAGES; page += 1) {
      let pageRows: AutomarketRow[];
      try {
        pageRows = await client.fetchAuctionRows({
          makerId,
          model,
          page,
          yearFrom: options.yearFrom,
          yearTo: options.yearTo,
        });
      } catch (error) {
        const message = `Search page ${page}: ${errorDetail(error)}`;
        if (!rows.length) throw new BadRequestException(message);
        errors.push(message);
        failedJobs += 1;
        this.logger.error(`[AUTOMARKET PAGE FAILED] ${message}`);
        await reportProgress('searching', message);
        break;
      }
      let addedRows = 0;
      for (const row of pageRows) {
        if (seenLotIds.has(row.id)) continue;
        seenLotIds.add(row.id);
        rows.push(row);
        addedRows += 1;
      }

      const candidateRows = targetLotId ? rows.filter((row) => row.id === targetLotId) : rows;
      completeRows = selectEligibleAutomarketRows(candidateRows, listSize, preferredAuctionGrade, today);
      targetLotFound = targetLotFound || candidateRows.length > 0;
      this.logger.log(
        `[AUTOMARKET PAGE] page=${page} fetched=${rows.length} eligible=${completeRows.length}`,
      );
      await reportProgress('searching');
      if (targetLotFound) break;
      if (!allUpcoming && completeRows.length >= (listSize ?? 0)) break;
      if (pageRows.length < AUTOMARKET_PAGE_SIZE || addedRows === 0) break;
      if (page === MAX_AUTOMARKET_PAGES) {
        const message = `Search stopped at the ${MAX_AUTOMARKET_PAGES}-page safety limit`;
        errors.push(message);
        failedJobs += 1;
        this.logger.warn(`[AUTOMARKET] ${message} for ${maker} ${model}`);
        await reportProgress('searching', message);
      } else {
        await delay(AUTOMARKET_PAGE_DELAY_MS);
      }
    }

    if (targetLotId && !targetLotFound) {
      throw new BadRequestException(`Automarket lot ${targetLotId} was not found in the selected search`);
    }
    if (targetLotId && completeRows.length === 0) {
      throw new BadRequestException(`Automarket lot ${targetLotId} is not an eligible upcoming auction`);
    }

    const exchangeRate = await this.settingsService.getJpyToLkrRate();
    await reportProgress('importing');

    for (const [index, row] of completeRows.entries()) {
      const sourceUrl = new URL(row.detailPath, AUTOMARKET_BASE_URL).toString();
      let rowError: string | undefined;
      try {
        const details = await client.fetchLotDetails(row.detailPath);
        if (details.averagePriceJpy <= 0) {
          throw new Error('detail-page average price is unavailable');
        }
        const images = await selectHighQualityImages(
          details.imageUrls.length ? details.imageUrls : row.previewImageUrl ? [row.previewImageUrl] : [],
          imageFilePrefix(row.model, row.lotNumber || row.id),
          this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000',
          this.mediaService,
          '/images/automarket',
        );
        if (!images.length) throw new Error('no usable auction images');

        const engineCapacity = normalizeEngineCapacity(row.engineCapacity, row.modelCode);
        const identity = `${row.model} ${row.modelCode} ${row.vehicleGrade}`;
        const fuelType = inferFuelType(identity);
        const makerName = automarketMakerDisplayName(row.maker);
        const dto: CreateCarDto = {
          title: cleanDisplayText(
            [row.year, makerName, titleCase(row.model), row.vehicleGrade].filter(Boolean).join(' '),
          ),
          maker: makerName,
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
            auctionPriceJpy: details.averagePriceJpy,
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
        this.logger.log(
          `[AUTOMARKET LOT] ${index + 1}/${completeRows.length} lot=${row.lotNumber || row.id} averagePriceJpy=${details.averagePriceJpy} listPriceJpy=${row.auctionPriceJpy} ${result.created ? 'inserted' : 'updated'}`,
        );
      } catch (error) {
        rowError = `Lot ${row.lotNumber || row.id}: ${errorDetail(error)}`;
        errors.push(rowError);
        failedJobs += 1;
        this.logger.error(`[AUTOMARKET LOT FAILED] ${sourceUrl}: ${rowError}`);
      }
      await reportProgress('importing', rowError);
    }

    return {
      fetched: rows.length,
      eligible: completeRows.length,
      imported: cars.length,
      created,
      updated,
      failedJobs,
      errors,
      cars,
    };
  }

  private async prepareManufacturerValueCache() {
    try {
      await this.websiteValuesService.ensureKnownValues();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[WEBSITE VALUE CACHE] could not seed known values: ${message}`);
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
          redirect: 'error',
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

export class AutomarketClient {
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
    page: number;
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
      vs: String(AUTOMARKET_PAGE_SIZE),
      pg: String(options.page),
    });
    const response = await this.request(`/auctions?${query}`);
    return parseAutomarketRows(await response.text());
  }

  async fetchLotDetails(path: string): Promise<AutomarketLotDetails> {
    const response = await this.request(path);
    const html = await response.text();
    const imageUrls = extractAutomarketImageUrls(html);
    const inlineAveragePrice = extractAutomarketAveragePriceJpy(html);
    if (inlineAveragePrice > 0) {
      return { averagePriceJpy: inlineAveragePrice, imageUrls };
    }

    const args = extractAutomarketAveragePriceArgs(html);
    if (!args) {
      return { averagePriceJpy: 0, imageUrls };
    }

    const averagePriceUrl = new URL(path, AUTOMARKET_BASE_URL);
    averagePriceUrl.searchParams.set('rs', 'getAveragePrice');
    averagePriceUrl.searchParams.set('rst', '');
    averagePriceUrl.searchParams.set('rsrnd', String(Date.now()));
    for (const argument of args) {
      averagePriceUrl.searchParams.append('rsargs[]', argument);
    }
    const averagePriceResponse = await this.request(averagePriceUrl.toString());
    const averagePriceJpy = extractAutomarketAveragePriceJpy(await averagePriceResponse.text());
    return { averagePriceJpy, imageUrls };
  }

  private async request(path: string, init: RequestInit = {}) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= AUTOMARKET_REQUEST_ATTEMPTS; attempt += 1) {
      try {
        return await this.requestOnce(path, init);
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        lastError = error;
        if (attempt < AUTOMARKET_REQUEST_ATTEMPTS) {
          await delay(attempt * 1_000);
        }
      }
    }

    throw new BadRequestException(
      `Automarket request failed after ${AUTOMARKET_REQUEST_ATTEMPTS} attempts: ${errorDetail(lastError)}`,
    );
  }

  private async requestOnce(path: string, init: RequestInit = {}) {
    let url = new URL(path, AUTOMARKET_BASE_URL);
    let requestInit = { ...init };

    for (let redirect = 0; redirect < 10; redirect += 1) {
      this.assertApprovedOrigin(url);
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
        if (response.ok) return response;
        if (response.status < 500 && response.status !== 429) {
          throw new BadRequestException(`Automarket request failed: ${response.status}`);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const location = response.headers.get('location');
      if (!location) throw new BadRequestException('Automarket returned an invalid redirect');
      url = new URL(location, url);
      this.assertApprovedOrigin(url);
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && requestInit.method === 'POST')) {
        requestInit = { method: 'GET' };
      }
    }
    throw new BadRequestException('Automarket returned too many redirects');
  }

  private assertApprovedOrigin(url: URL) {
    if (!isApprovedAutomarketUrl(url)) {
      throw new BadRequestException('Automarket returned an unapproved redirect');
    }
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

export function selectEligibleAutomarketRows(
  rows: AutomarketRow[],
  listSize: number | undefined,
  preferredAuctionGrade?: string,
  today = colomboDateKey(),
) {
  const eligibleRows = rows.filter((row) => {
    const auctionDate = normalizeAuctionDate(row.auctionDate);
    return row.mileageKm > 0
      && row.auctionGrade
      && auctionDate !== undefined
      && auctionDate >= today
      && (!preferredAuctionGrade || normalizeAuctionGrade(row.auctionGrade) === preferredAuctionGrade);
  });

  return listSize === undefined ? eligibleRows : eligibleRows.slice(0, listSize);
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

export function extractAutomarketAveragePriceArgs(html: string) {
  const calls = html.matchAll(/\bgetAveragePrice\s*\(\s*(?=['"])([\s\S]*?)\)\s*;/g);
  for (const call of calls) {
    const body = call[1].trim();
    if (!body.startsWith("'") && !body.startsWith('"')) continue;
    const args = [...body.matchAll(/(['"])((?:\\.|[^\\])*?)\1/g)].map((match) =>
      match[2].replace(/\\(['"\\])/g, '$1'),
    );
    if (args.length === 7) return args;
  }
  return undefined;
}

export function extractAutomarketAveragePriceJpy(responseBody: string) {
  const normalized = responseBody.replace(/\\"/g, '"').replace(/\\'/g, "'");
  const $ = cheerio.load(normalized);
  const markedValue = $('#average-price-sum').first().text();
  if (markedValue) return toNumber(markedValue);

  const fallback = normalized.match(/Average price:[\s\S]{0,500}?([\d][\d\s,.]*)\s*JPY/i);
  return fallback ? toNumber(fallback[1]) : 0;
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

  for (const url of urls.slice(0, MAX_AUCTION_IMAGES_PER_CAR)) {
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
    .map((url) => url.replace(/^http:/i, 'https:'))
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

function errorDetail(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause && typeof cause === 'object') {
    const code = 'code' in cause ? String(cause.code) : '';
    const message = 'message' in cause ? String(cause.message) : '';
    const detail = [code, message].filter(Boolean).join(': ');
    if (detail) return `${error.message} (${detail})`;
  }
  return error.message;
}

async function fetchImage(url: string) {
  try {
    if (!isApprovedAuctionImageUrl(url)) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const declaredSize = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_AUCTION_IMAGE_BYTES) return null;

    const buffer = await readResponseBuffer(response, MAX_AUCTION_IMAGE_BYTES);
    if (!buffer) return null;
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

export function isApprovedAuctionImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:'
      && (url.hostname === 'i.aleado.ru' || /^(?:\d+\.)?ajes\.com$/i.test(url.hostname))
    );
  } catch {
    return false;
  }
}

export function isApprovedAutomarketUrl(value: string | URL) {
  try {
    return new URL(value).origin === AUTOMARKET_ORIGIN;
  } catch {
    return false;
  }
}

async function readResponseBuffer(response: Response, maxBytes: number) {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
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
    contentType: imageContentType(extension),
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

function imageContentType(extension: string) {
  if (extension === '.png') return 'image/png';
  if (extension === '.gif') return 'image/gif';
  return 'image/jpeg';
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

export function automarketMakerDisplayName(value: string) {
  const normalized = value.trim().toUpperCase();
  const displayNames: Record<string, string> = {
    BMW: 'BMW',
    'BMW ALPINA': 'BMW Alpina',
    BYD: 'BYD',
    GMC: 'GMC',
    MG: 'MG',
    'NISSAN DIESEL (UD)': 'Nissan Diesel (UD)',
    TVR: 'TVR',
  };
  return displayNames[normalized] ?? titleCase(value);
}

function isUsableVehicleImage(dimensions: { width: number; height: number }) {
  if (
    dimensions.width <= 0
    || dimensions.height <= 0
    || dimensions.width * dimensions.height > MAX_AUCTION_IMAGE_PIXELS
  ) {
    return false;
  }
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
