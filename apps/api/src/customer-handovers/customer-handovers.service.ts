import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MediaService } from '../media/media.service';
import { UploadsService } from '../uploads/uploads.service';
import { CustomerHandover } from './customer-handover.schema';

@Injectable()
export class CustomerHandoversService {
  constructor(
    @InjectModel(CustomerHandover.name)
    private readonly customerHandoverModel: Model<CustomerHandover>,
    private readonly uploadsService: UploadsService,
    private readonly mediaService: MediaService,
  ) {}

  findAll() {
    return this.customerHandoverModel.find().sort({ createdAt: -1, _id: -1 }).lean();
  }

  async create(file: Express.Multer.File) {
    const [imageUrl] = await this.uploadsService.saveImages([file], 'customer-handover');

    try {
      return await this.customerHandoverModel.create({ imageUrl });
    } catch (error) {
      await this.mediaService.deleteImages([imageUrl]);
      throw error;
    }
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Handover post not found');

    const handover = await this.customerHandoverModel.findByIdAndDelete(id).lean();
    if (!handover) throw new NotFoundException('Handover post not found');

    await this.mediaService.deleteImages([handover.imageUrl]);
    return { deleted: true };
  }
}
