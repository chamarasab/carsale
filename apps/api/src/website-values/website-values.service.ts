import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCarDto } from '../cars/dto';
import { CreateWebsiteValueDto, UpdateWebsiteValueDto } from './dto';
import { KNOWN_WEBSITE_VALUES, MANUFACTURER_PRICE_SOURCES } from './manufacturer-sources';
import { WebsiteValue } from './website-value.schema';
import { WebsiteValueMiss } from './website-value-miss.schema';
import {
  selectWebsiteValueForCar,
  WebsiteValueCarIdentity,
  WebsiteValueCandidate,
} from './website-value-matcher';

@Injectable()
export class WebsiteValuesService implements OnModuleInit {
  private readonly logger = new Logger(WebsiteValuesService.name);

  constructor(
    @InjectModel(WebsiteValue.name)
    private readonly websiteValueModel: Model<WebsiteValue>,
    @InjectModel(WebsiteValueMiss.name)
    private readonly websiteValueMissModel: Model<WebsiteValueMiss>,
  ) {}

  async onModuleInit() {
    await this.ensureKnownValues();
  }

  findAll() {
    return this.websiteValueModel.find().sort({ no: 1 }).lean();
  }

  create(dto: CreateWebsiteValueDto) {
    return this.websiteValueModel.create(this.normalize(dto));
  }

  async update(id: string, dto: UpdateWebsiteValueDto) {
    const value = await this.websiteValueModel
      .findByIdAndUpdate(id, this.normalize(dto), { new: true })
      .lean();
    if (!value)
      throw new NotFoundException('Manufacturer website value not found');
    return value;
  }

  async remove(id: string) {
    const value = await this.websiteValueModel.findById(id).lean();
    if (!value)
      throw new NotFoundException('Manufacturer website value not found');
    if (KNOWN_WEBSITE_VALUES.some((known) => known.key === value.key)) {
      await this.websiteValueModel.findByIdAndUpdate(id, { active: false });
      return { deleted: false, deactivated: true };
    }
    await this.websiteValueModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async refreshKnownSources() {
    await this.ensureKnownValues();
    const sources = await Promise.all(
      MANUFACTURER_PRICE_SOURCES.map(async (source) => {
        try {
          const response = await fetch(source.url, {
            headers: {
              Accept: 'text/html,application/json',
              'User-Agent': 'GenuineAutomobiles/1.0',
            },
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const prices = source.extract(await response.text());
          const syncedAt = new Date();
          const updates = source.records.flatMap((record) => {
            const price = prices.get(record.key);
            if (!price || price <= 0) return [];
            return [{
              updateOne: {
                filter: { key: record.key },
                update: {
                  $set: {
                    price,
                    sourceUrl: record.sourceUrl,
                    sourceDataUrl: record.sourceDataUrl,
                    lastSyncedAt: syncedAt,
                  },
                },
              },
            }];
          });

          if (updates.length) await this.websiteValueModel.bulkWrite(updates);
          this.logger.log(`Refreshed ${updates.length} ${source.label} manufacturer prices`);
          return {
            id: source.id,
            label: source.label,
            sourceUrl: source.url,
            fetched: prices.size,
            updated: updates.length,
            syncedAt: syncedAt.toISOString(),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`${source.label} manufacturer refresh skipped: ${message}`);
          return {
            id: source.id,
            label: source.label,
            sourceUrl: source.url,
            fetched: 0,
            updated: 0,
            error: message,
          };
        }
      }),
    );

    return {
      fetched: sources.reduce((total, source) => total + source.fetched, 0),
      updated: sources.reduce((total, source) => total + source.updated, 0),
      failed: sources.filter((source) => 'error' in source).length,
      syncedAt: new Date().toISOString(),
      sources,
    };
  }

  async ensureKnownValues() {
    const existing = await this.websiteValueModel.find().select({ key: 1, no: 1 }).lean();
    const existingKeys = new Set(existing.map((value) => value.key));
    const usedNumbers = new Set(existing.map((value) => value.no));
    let nextNumber = Math.max(
      0,
      ...existing.map((value) => value.no),
      ...KNOWN_WEBSITE_VALUES.map((value) => value.no),
    );
    const valuesToSeed = KNOWN_WEBSITE_VALUES
      .filter((value) => !existingKeys.has(value.key))
      .map((value) => {
        let no = value.no;
        while (usedNumbers.has(no)) no = ++nextNumber;
        usedNumbers.add(no);
        return { ...value, no };
      });
    if (!valuesToSeed.length) return { seeded: 0 };

    try {
      await this.websiteValueModel.bulkWrite(
        valuesToSeed.map((value) => ({
          updateOne: {
            filter: { key: value.key },
            update: { $setOnInsert: value },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      this.logger.warn('Manufacturer value seeding encountered a concurrent duplicate; existing records were kept');
    }
    return { seeded: valuesToSeed.length };
  }

  findMissing() {
    return this.websiteValueMissModel.find({ status: 'missing' }).sort({ lastSeenAt: -1 }).lean();
  }

  countMissing() {
    return this.websiteValueMissModel.countDocuments({ status: 'missing' });
  }

  async ignoreMissing(id: string) {
    const miss = await this.websiteValueMissModel
      .findByIdAndUpdate(id, { status: 'ignored' }, { new: true })
      .lean();
    if (!miss) throw new NotFoundException('Missing website value alert not found');
    return miss;
  }

  async applyToCost(car: WebsiteValueCarIdentity, cost: CreateCarDto['cost']) {
    const cleanCost = withoutWebsiteValue(cost);
    const records = await this.websiteValueModel
      .find({
        maker: exactText(car.maker),
        active: true,
      })
      .lean();
    const match = selectWebsiteValueForCar(
      records as WebsiteValueCandidate[],
      car,
    );
    if (!match) {
      await this.recordMissingValue(car);
      return cleanCost;
    }
    await this.resolveMissingValue(car);

    return {
      ...cleanCost,
      websiteValueRecordId: String(match._id),
      websiteValueNo: match.no,
      websiteValueJpy: match.price,
      websiteValueVehicleModel: match.vehicleModel,
      websiteValueGrade: match.vehicleGrade,
      websiteValueDrivetrain: match.drivetrain,
      websiteValueSourceUrl: match.sourceUrl,
      websiteValueTaxIncluded: match.taxIncluded,
      websiteValueTaxRate: match.consumptionTaxRate,
      websiteValueDepreciationRate: match.customsDepreciationRate,
      websiteValueEffectiveFrom: match.effectiveFrom,
    };
  }

  private async recordMissingValue(car: WebsiteValueCarIdentity) {
    if (!car.maker?.trim() || !car.model?.trim()) return;
    const now = new Date();
    const key = websiteValueMissKey(car);
    try {
      const current = await this.websiteValueMissModel.findOne({ key }).select({ status: 1 }).lean();
      const ignored = current?.status === 'ignored';
      await this.websiteValueMissModel.updateOne(
        { key },
        {
          $set: {
            maker: car.maker.trim(),
            model: car.model.trim(),
            title: car.title?.trim(),
            modelCode: car.modelCode?.trim(),
            chassisCode: car.chassisCode?.trim(),
            vehicleGrade: car.vehicleGrade?.trim(),
            source: car.source?.trim(),
            sourceUrl: car.sourceUrl?.trim(),
            lastSeenAt: now,
            ...(ignored ? {} : { status: 'missing' }),
          },
          $setOnInsert: { firstSeenAt: now },
          $inc: { occurrences: 1 },
          ...(ignored ? {} : { $unset: { resolvedAt: 1 } }),
        },
        { upsert: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not record missing manufacturer value: ${message}`);
    }
  }

  private async resolveMissingValue(car: WebsiteValueCarIdentity) {
    if (!car.maker?.trim() || !car.model?.trim()) return;
    try {
      await this.websiteValueMissModel.updateOne(
        { key: websiteValueMissKey(car), status: 'missing' },
        { $set: { status: 'resolved', resolvedAt: new Date() } },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not resolve manufacturer value alert: ${message}`);
    }
  }

  private normalize<T extends CreateWebsiteValueDto | UpdateWebsiteValueDto>(
    dto: T,
  ): T {
    return {
      ...dto,
      key: dto.key?.trim().toLowerCase(),
      maker: dto.maker?.trim(),
      model: dto.model?.trim(),
      vehicleModel: dto.vehicleModel?.trim(),
      vehicleGrade: dto.vehicleGrade?.trim(),
      aliases: dto.aliases?.map((value) => value.trim()).filter(Boolean),
      drivetrain: dto.drivetrain,
      modelCodes: dto.modelCodes
        ?.map((value) => value.trim().toUpperCase())
        .filter(Boolean),
      sourceUrl: dto.sourceUrl?.trim(),
      sourceDataUrl: dto.sourceDataUrl?.trim(),
    };
  }
}

export function websiteValueMissKey(car: WebsiteValueCarIdentity) {
  return [car.maker, car.model, car.modelCode, car.chassisCode, car.vehicleGrade]
    .map((value) =>
      (value ?? '')
        .normalize('NFKC')
        .toUpperCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-'),
    )
    .join('|');
}

function exactText(value?: string) {
  return new RegExp(`^${escapeRegExp(value?.trim() ?? '')}$`, 'i');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withoutWebsiteValue(cost: CreateCarDto['cost']): CreateCarDto['cost'] {
  const {
    websiteValueRecordId: _recordId,
    websiteValueNo: _no,
    websiteValueJpy: _price,
    websiteValueVehicleModel: _model,
    websiteValueGrade: _grade,
    websiteValueDrivetrain: _drivetrain,
    websiteValueSourceUrl: _sourceUrl,
    websiteValueTaxIncluded: _taxIncluded,
    websiteValueTaxRate: _taxRate,
    websiteValueDepreciationRate: _depreciationRate,
    websiteValueEffectiveFrom: _effectiveFrom,
    websiteValueNetJpy: _net,
    websiteValueAssessedFobJpy: _assessedFob,
    websiteValueCifJpy: _cifJpy,
    websiteValueCifLkr: _cifLkr,
    ...cleanCost
  } = cost;
  return cleanCost;
}
