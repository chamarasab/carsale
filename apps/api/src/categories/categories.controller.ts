import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GoogleJwtGuard } from '../auth/google-jwt.guard';
import { CategoriesService } from './categories.service';
import { CreateVehicleCategoryDto, UpdateVehicleCategoryDto } from './dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @UseGuards(GoogleJwtGuard)
  @Post()
  create(@Body() dto: CreateVehicleCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(GoogleJwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(GoogleJwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
