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
import {
  TOYOTA_ROOMY_DATA_URL,
  TOYOTA_ROOMY_WEBSITE_VALUES,
} from './roomy-source';
import { WebsiteValue } from './website-value.schema';
import {
  selectWebsiteValueForCar,
  WebsiteValueCarIdentity,
  WebsiteValueCandidate,
} from './website-value-matcher';

type ToyotaGrade = {
  modelCode?: string;
  priceNumber?: number;
};

@Injectable()
export class WebsiteValuesService implements OnModuleInit {
  private readonly logger = new Logger(WebsiteValuesService.name);

  constructor(
    @InjectModel(WebsiteValue.name)
    private readonly websiteValueModel: Model<WebsiteValue>,
  ) {}

  async onModuleInit() {
    await this.seedKnownValues();
    void this.refreshKnownSources().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Manufacturer website refresh skipped: ${message}`);
    });
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
    if (value.sourceDataUrl === TOYOTA_ROOMY_DATA_URL) {
      await this.websiteValueModel.findByIdAndUpdate(id, { active: false });
      return { deleted: false, deactivated: true };
    }
    await this.websiteValueModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async refreshKnownSources() {
    await this.seedKnownValues();
    const response = await fetch(TOYOTA_ROOMY_DATA_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GenuineAutomobiles/1.0',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(
        `Toyota Roomy price feed returned HTTP ${response.status}`,
      );
    }

    const grades = (await response.json()) as ToyotaGrade[];
    const syncedAt = new Date();
    const updates = TOYOTA_ROOMY_WEBSITE_VALUES.flatMap((fallback) => {
      const grade = grades.find(
        (item) =>
          item.modelCode?.toUpperCase() ===
          fallback.modelCodes[0].toUpperCase(),
      );
      if (!grade?.priceNumber || grade.priceNumber <= 0) return [];
      return [
        {
          updateOne: {
            filter: { key: fallback.key },
            update: {
              $set: {
                price: grade.priceNumber,
                sourceUrl: fallback.sourceUrl,
                sourceDataUrl: fallback.sourceDataUrl,
                lastSyncedAt: syncedAt,
              },
            },
          },
        },
      ];
    });

    if (updates.length) await this.websiteValueModel.bulkWrite(updates);
    this.logger.log(
      `Refreshed ${updates.length} Toyota Roomy manufacturer prices`,
    );
    return {
      sourceUrl: TOYOTA_ROOMY_DATA_URL,
      fetched: grades.length,
      updated: updates.length,
      syncedAt: syncedAt.toISOString(),
    };
  }

  async applyToCost(car: WebsiteValueCarIdentity, cost: CreateCarDto['cost']) {
    const cleanCost = withoutWebsiteValue(cost);
    const records = await this.websiteValueModel
      .find({
        maker: exactText(car.maker),
        model: exactText(car.model),
        active: true,
      })
      .lean();
    const match = selectWebsiteValueForCar(
      records as WebsiteValueCandidate[],
      car,
    );
    if (!match) return cleanCost;

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

  private async seedKnownValues() {
    await this.websiteValueModel.bulkWrite(
      TOYOTA_ROOMY_WEBSITE_VALUES.map((value) => ({
        updateOne: {
          filter: { key: value.key },
          update: { $setOnInsert: value },
          upsert: true,
        },
      })),
    );
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
