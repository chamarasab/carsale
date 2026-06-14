import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateInquiryDto } from './dto';
import { Inquiry } from './inquiry.schema';

@Injectable()
export class InquiriesService {
  constructor(@InjectModel(Inquiry.name) private readonly inquiryModel: Model<Inquiry>) {}

  create(dto: CreateInquiryDto) {
    return this.inquiryModel.create({
      ...dto,
      carId: new Types.ObjectId(dto.carId),
    });
  }

  findAll() {
    return this.inquiryModel.find().populate('carId').sort({ createdAt: -1 }).lean();
  }
}
