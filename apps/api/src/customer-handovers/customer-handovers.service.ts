import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MediaService } from '../media/media.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  BUNDLED_CUSTOMER_HANDOVERS,
  findBundledCustomerHandover,
} from './bundled-customer-handovers';
import { CustomerHandover } from './customer-handover.schema';

@Injectable()
export class CustomerHandoversService {
  constructor(
    @InjectModel(CustomerHandover.name)
    private readonly customerHandoverModel: Model<CustomerHandover>,
    private readonly uploadsService: UploadsService,
    private readonly mediaService: MediaService,
  ) {}

  async findAll() {
    const records = await this.customerHandoverModel.find().sort({ createdAt: -1, _id: -1 }).lean();
    const hiddenSourceKeys = new Set(
      records
        .filter((record) => record.hidden && record.sourceKey)
        .map((record) => record.sourceKey as string),
    );
    const uploaded = records
      .filter((record) => !record.hidden)
      .map((record) => ({ ...record, origin: 'uploaded' as const }));
    const bundled = BUNDLED_CUSTOMER_HANDOVERS.filter(
      (handover) => !hiddenSourceKeys.has(handover.sourceKey),
    );

    return [...uploaded, ...bundled];
  }

  async create(file: Express.Multer.File) {
    const [imageUrl] = await this.uploadsService.saveImages([file], 'customer-handover');

    try {
      return await this.customerHandoverModel.create({ imageUrl, origin: 'uploaded' });
    } catch (error) {
      await this.mediaService.deleteImages([imageUrl]);
      throw error;
    }
  }

  async remove(id: string) {
    const bundledHandover = findBundledCustomerHandover(id);
    if (bundledHandover) {
      await this.customerHandoverModel.updateOne(
        { sourceKey: bundledHandover.sourceKey },
        {
          $set: {
            hidden: true,
            imageUrl: bundledHandover.imageUrl,
            origin: 'bundled',
            sourceKey: bundledHandover.sourceKey,
          },
        },
        { upsert: true },
      );
      return { deleted: true };
    }

    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Handover post not found');

    const handover = await this.customerHandoverModel.findByIdAndDelete(id).lean();
    if (!handover) throw new NotFoundException('Handover post not found');

    await this.mediaService.deleteImages([handover.imageUrl]);
    return { deleted: true };
  }
}
