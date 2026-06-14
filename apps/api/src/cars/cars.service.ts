import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { SettingsService } from '../settings/settings.service';
import { Car } from './car.schema';
import { applyWorkbookReferenceCost } from './cost-reference';
import { CreateCarDto, UpdateCarDto } from './dto';
import { calculateImportCost } from './tax-calculator';

@Injectable()
export class CarsService {
  constructor(
    @InjectModel(Car.name) private readonly carModel: Model<Car>,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: { q?: string; maker?: string; status?: string }) {
    const filter: FilterQuery<Car> = { published: true };

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    if (query.maker) {
      filter.maker = new RegExp(`^${query.maker}$`, 'i');
    }

    if (query.status) {
      filter.status = query.status;
    }

    const cars = await this.carModel.find(filter).sort({ createdAt: -1 }).lean();
    return cars.map((car) => this.withPublicImageUrls(car));
  }

  async findOne(id: string) {
    const car = await this.carModel.findOne({ _id: id, published: true }).lean();
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return this.withPublicImageUrls(car);
  }

  async create(dto: CreateCarDto) {
    return this.carModel.create(await this.withCalculatedCost(dto));
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

    return { car, created: false };
  }

  async update(id: string, dto: UpdateCarDto) {
    const car = await this.carModel
      .findByIdAndUpdate(id, await this.withCalculatedCost(dto), { new: true })
      .lean();

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return car;
  }

  async remove(id: string) {
    const car = await this.carModel.findByIdAndDelete(id).lean();
    if (!car) {
      throw new NotFoundException('Car not found');
    }
    return { deleted: true };
  }

  async recalculateAll() {
    const settings = await this.settingsService.getTaxSettings();
    const exchangeRate = await this.settingsService.getJpyToLkrRate();
    const cars = await this.carModel.find().lean();

    for (const car of cars) {
      const cost = this.withCurrentExchangeRate(car, exchangeRate);
      await this.carModel.findByIdAndUpdate(car._id, {
        cost: calculateImportCost(cost as CreateCarDto['cost'], settings),
      });
    }

    return { recalculated: cars.length, exchangeRate };
  }

  private async withCalculatedCost(dto: CreateCarDto): Promise<CreateCarDto & { cost: ReturnType<typeof calculateImportCost> }>;
  private async withCalculatedCost(dto: UpdateCarDto): Promise<UpdateCarDto>;
  private async withCalculatedCost(dto: CreateCarDto | UpdateCarDto) {
    if (!dto.cost) {
      return dto;
    }

    const settings = await this.settingsService.getTaxSettings();
    return { ...dto, cost: calculateImportCost(dto.cost as CreateCarDto['cost'], settings) };
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
    car: Pick<Car, 'maker' | 'model' | 'chassisCode' | 'cost'>,
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

  private isWorkbookLockedEvery(car: Pick<Car, 'maker' | 'model' | 'chassisCode' | 'cost'>) {
    return (
      /suzuki/i.test(car.maker) &&
      /every/i.test(car.model) &&
      /DA17V/i.test(car.chassisCode || '') &&
      car.cost.vehicleType?.toLowerCase().includes('commercial van')
    );
  }
}
