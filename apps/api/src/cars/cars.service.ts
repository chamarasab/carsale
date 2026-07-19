import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { SettingsService } from '../settings/settings.service';
import { AuthUser } from '../auth/auth.types';
import { MediaService } from '../media/media.service';
import { WebsiteValuesService } from '../website-values/website-values.service';
import { AUCTION_GRADES, normalizeAuctionGrade } from './auction-grades';
import { Car } from './car.schema';
import { applyWorkbookReferenceCost } from './cost-reference';
import { CreateCarDto, UpdateCarDto } from './dto';
import { calculateImportCost, prepareCostForRecalculation } from './tax-calculator';

@Injectable()
export class CarsService {
  constructor(
    @InjectModel(Car.name) private readonly carModel: Model<Car>,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly mediaService: MediaService,
    private readonly websiteValuesService: WebsiteValuesService,
  ) {}

  async findAll(query: { q?: string; maker?: string; model?: string; status?: string }) {
    const filter: FilterQuery<Car> = { published: true, auctionGrade: { $in: AUCTION_GRADES } };

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    if (query.maker) {
      filter.maker = new RegExp(`^${query.maker}$`, 'i');
    }

    if (query.model) {
      filter.model = new RegExp(`^${query.model}$`, 'i');
    }

    if (query.status) {
      filter.status = query.status;
    }

    const cars = await this.carModel.find(filter).sort({ createdAt: -1 }).lean();
    return cars.map((car) => this.withPublicImageUrls(car));
  }

  async findManageable(user: AuthUser) {
    const filter: FilterQuery<Car> = user.role === 'ADMIN' ? {} : { createdBy: user.id };
    const cars = await this.carModel.find(filter).sort({ published: 1, createdAt: -1 }).lean();
    return cars.map((car) => this.withPublicImageUrls(car));
  }

  async findPending() {
    const cars = await this.carModel.find({ published: false }).sort({ createdAt: -1 }).lean();
    return cars.map((car) => this.withPublicImageUrls(car));
  }

  async findOne(id: string) {
    const car = await this.carModel
      .findOne({ _id: id, published: true, auctionGrade: { $in: AUCTION_GRADES } })
      .lean();
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return this.withPublicImageUrls(car);
  }

  async create(dto: CreateCarDto, user?: AuthUser) {
    const payload = await this.withCalculatedCost(dto);
    return this.carModel.create({
      ...payload,
      published: user?.role === 'ADMIN' ? (payload.published ?? true) : false,
      ...(user ? { createdBy: user.id, createdByName: user.name } : {}),
    });
  }

  async upsertBySourceUrl(dto: CreateCarDto) {
    if (!dto.sourceUrl) {
      return { car: await this.create(dto), created: true };
    }

    const existing = await this.carModel.findOne({ sourceUrl: dto.sourceUrl }).lean();
    const payload = await this.withCalculatedCost(dto);

    if (!existing) {
      return { car: await this.carModel.create(payload), created: true };
    }

    const car = await this.carModel
      .findByIdAndUpdate(existing._id, payload, { new: true })
      .lean();
    await this.mediaService.deleteImages(existing.images.filter((image) => !payload.images.includes(image)));

    return { car, created: false };
  }

  async update(id: string, dto: UpdateCarDto, user?: AuthUser) {
    await this.assertCanManage(id, user);
    const existing = await this.carModel.findById(id).lean();
    if (!existing) {
      throw new NotFoundException('Car not found');
    }
    const payload = await this.withCalculatedCost(dto, existing);
    if (user?.role !== 'ADMIN') {
      delete payload.published;
    }
    const car = await this.carModel
      .findByIdAndUpdate(id, payload, { new: true })
      .lean();

    if (!car) {
      throw new NotFoundException('Car not found');
    }
    if (payload.images && existing) {
      await this.mediaService.deleteImages(existing.images.filter((image) => !payload.images?.includes(image)));
    }

    return this.withPublicImageUrls(car);
  }

  async setPublished(id: string, published: boolean) {
    const car = await this.carModel.findByIdAndUpdate(id, { published }, { new: true }).lean();
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return this.withPublicImageUrls(car);
  }

  async remove(id: string, user?: AuthUser) {
    await this.assertCanManage(id, user);
    const car = await this.carModel.findByIdAndDelete(id).lean();
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    await this.mediaService.deleteImages(car.images);
    return { deleted: true };
  }

  async removeExpiredScrapedAuctions(today = colomboDateKey()) {
    const candidates = await this.carModel
      .find({ source: { $in: ['JP Center', 'A-Automarket'] }, auctionDate: { $exists: true, $ne: '' } })
      .select('_id auctionDate images')
      .lean();
    const expired = candidates.filter((car) => {
      const date = normalizeAuctionDate(car.auctionDate);
      return date !== undefined && date < today;
    });

    let deletedImages = 0;
    for (const car of expired) {
      deletedImages += await this.mediaService.deleteImages(car.images);
    }
    if (expired.length) {
      await this.carModel.deleteMany({ _id: { $in: expired.map((car) => car._id) } });
    }
    return { deletedCars: expired.length, deletedImages, cutoffDate: today };
  }

  async sanitizeAuctionGrades() {
    const cars = await this.carModel
      .find()
      .select('_id auctionGrade source images published')
      .lean();
    let normalizedCars = 0;
    let deletedCars = 0;
    let unpublishedCars = 0;
    let deletedImages = 0;

    for (const car of cars) {
      const grade = normalizeAuctionGrade(car.auctionGrade);
      if (grade) {
        if (grade !== car.auctionGrade) {
          await this.carModel.findByIdAndUpdate(car._id, { auctionGrade: grade });
          normalizedCars += 1;
        }
        continue;
      }

      if (['JP Center', 'A-Automarket'].includes(car.source)) {
        deletedImages += await this.mediaService.deleteImages(car.images);
        await this.carModel.findByIdAndDelete(car._id);
        deletedCars += 1;
      } else if (car.published) {
        await this.carModel.findByIdAndUpdate(car._id, { published: false });
        unpublishedCars += 1;
      }
    }

    return { normalizedCars, deletedCars, unpublishedCars, deletedImages };
  }

  private async assertCanManage(id: string, user?: AuthUser) {
    if (!user || user.role === 'ADMIN') return;
    const car = await this.carModel.findById(id).select('createdBy').lean();
    if (!car) throw new NotFoundException('Car not found');
    if (car.createdBy !== user.id) throw new ForbiddenException('You can only manage your own advertisements');
  }

  async recalculateAll() {
    const settings = await this.settingsService.getTaxSettings();
    const exchangeRate = await this.settingsService.getJpyToLkrRate();
    const cars = await this.carModel.find().lean();

    for (const car of cars) {
      const websiteCost = await this.websiteValuesService.applyToCost(
        car,
        this.migrateLegacyRoomyCost(car.cost),
      );
      const cost = prepareCostForRecalculation(
        this.withCurrentExchangeRate({ ...car, cost: websiteCost }, exchangeRate),
      );
      const calculatedCost = calculateImportCost(cost as CreateCarDto['cost'], settings);
      await this.carModel.findByIdAndUpdate(car._id, {
        cost: calculatedCost,
        fuelType: calculatedCost.fuelType ?? car.fuelType,
      });
    }

    return { recalculated: cars.length, exchangeRate };
  }

  private async withCalculatedCost(dto: CreateCarDto): Promise<CreateCarDto & { cost: ReturnType<typeof calculateImportCost> }>;
  private async withCalculatedCost(dto: UpdateCarDto, existing: Car): Promise<UpdateCarDto>;
  private async withCalculatedCost(dto: CreateCarDto | UpdateCarDto, existing?: Car) {
    const normalizedDto = this.withValidAuctionGrade(dto);
    const rawCost = normalizedDto.cost
      ? { ...(existing?.cost ?? {}), ...normalizedDto.cost }
      : existing?.cost;
    if (!rawCost) {
      return normalizedDto;
    }

    const identity = { ...existing, ...normalizedDto };
    const websiteCost = await this.websiteValuesService.applyToCost(
      identity,
      this.migrateLegacyRoomyCost(rawCost as CreateCarDto['cost']),
    );
    const referenceCost = this.isWorkbookLockedEvery({ ...identity, cost: websiteCost } as Car)
      ? websiteCost
      : applyWorkbookReferenceCost({ ...identity, cost: websiteCost });
    const settings = await this.settingsService.getTaxSettings();
    return {
      ...normalizedDto,
      cost: calculateImportCost(referenceCost, settings),
    };
  }

  private withValidAuctionGrade<T extends CreateCarDto | UpdateCarDto>(dto: T): T {
    if (dto.auctionGrade === undefined) return dto;
    const auctionGrade = normalizeAuctionGrade(dto.auctionGrade);
    if (!auctionGrade) {
      throw new BadRequestException(`Auction grade must be one of: ${AUCTION_GRADES.join(', ')}`);
    }
    return { ...dto, auctionGrade };
  }

  private withPublicImageUrls<T extends { images?: string[] }>(car: T): T {
    const publicBaseUrl = (
      this.configService.get<string>('API_PUBLIC_URL') ||
      this.configService.get<string>('RENDER_EXTERNAL_URL') ||
      'https://carsale-1.onrender.com'
    ).replace(/\/$/, '');
    if (!publicBaseUrl || !car.images) return car;

    return {
      ...car,
      images: car.images.map((image) =>
        image.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):4000/i, publicBaseUrl),
      ),
    };
  }

  private withCurrentExchangeRate(
    car: Pick<
      Car,
      'title' | 'maker' | 'model' | 'modelCode' | 'vehicleGrade' | 'auctionGrade' | 'chassisCode' | 'features'
    > & { cost: CreateCarDto['cost'] },
    exchangeRate: Awaited<ReturnType<SettingsService['getJpyToLkrRate']>>,
  ) {
    if (this.isWorkbookLockedEvery(car)) {
      return car.cost;
    }

    return {
      ...applyWorkbookReferenceCost(car),
      exchangeRateLkr: exchangeRate.rate,
      exchangeRateDate: exchangeRate.date,
      exchangeRateSource: exchangeRate.source,
      exchangeRateProvider: exchangeRate.provider,
    };
  }

  private isWorkbookLockedEvery(
    car: Pick<Car, 'maker' | 'model' | 'chassisCode'> & { cost: CreateCarDto['cost'] },
  ) {
    return (
      /suzuki/i.test(car.maker) &&
      /every/i.test(car.model) &&
      /DA17V/i.test(car.chassisCode || '') &&
      car.cost.vehicleType?.toLowerCase().includes('commercial van')
    );
  }

  private migrateLegacyRoomyCost(cost: CreateCarDto['cost']): CreateCarDto['cost'] {
    if (cost.referenceSource !== 'docs/roomy_tax.pdf page 2') return cost;
    return {
      ...cost,
      freightJpy: this.configService.get<number>('DEFAULT_FREIGHT_JPY') ?? 220_000,
      insuranceJpy: this.configService.get<number>('DEFAULT_INSURANCE_JPY') ?? 50_000,
      invoiceCifJpy: undefined,
    };
  }
}

export function normalizeAuctionDate(value?: string) {
  const text = value?.trim();
  if (!text) return undefined;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const local = text.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : undefined;
  if (!parts) return undefined;
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function colomboDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
