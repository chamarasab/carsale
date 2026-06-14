import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateVehicleCategoryDto, UpdateVehicleCategoryDto } from './dto';
import { VehicleCategory } from './vehicle-category.schema';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(VehicleCategory.name) private readonly categoryModel: Model<VehicleCategory>) {}

  findAll() {
    return this.categoryModel.find().sort({ maker: 1, model: 1, code: 1 }).lean();
  }

  async create(dto: CreateVehicleCategoryDto) {
    return this.categoryModel.create(this.normalize(dto));
  }

  async update(id: string, dto: UpdateVehicleCategoryDto) {
    const category = await this.categoryModel.findByIdAndUpdate(id, this.normalize(dto), { new: true }).lean();
    if (!category) {
      throw new NotFoundException('Vehicle category not found');
    }
    return category;
  }

  async remove(id: string) {
    const category = await this.categoryModel.findByIdAndDelete(id).lean();
    if (!category) {
      throw new NotFoundException('Vehicle category not found');
    }
    return { deleted: true };
  }

  private normalize<T extends CreateVehicleCategoryDto | UpdateVehicleCategoryDto>(dto: T): T {
    return {
      ...dto,
      code: dto.code?.trim().toUpperCase(),
    };
  }
}
