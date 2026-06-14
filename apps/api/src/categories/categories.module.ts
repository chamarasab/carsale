import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { VehicleCategory, VehicleCategorySchema } from './vehicle-category.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: VehicleCategory.name, schema: VehicleCategorySchema }]), AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
