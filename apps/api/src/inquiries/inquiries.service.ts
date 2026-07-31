import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CarsService } from '../cars/cars.service';
import { CreateInquiryDto } from './dto';
import { Inquiry } from './inquiry.schema';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectModel(Inquiry.name) private readonly inquiryModel: Model<Inquiry>,
    private readonly carsService: CarsService,
  ) {}

  async create(dto: CreateInquiryDto) {
    if (!(await this.carsService.isPublished(dto.carId))) {
      throw new NotFoundException('Car not found or no longer available');
    }
    return this.inquiryModel.create({
      ...dto,
      carId: new Types.ObjectId(dto.carId),
    });
  }

  findAll() {
    return this.inquiryModel.find().populate('carId').sort({ createdAt: -1 }).lean();
  }
}
