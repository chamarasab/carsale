import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { GoogleJwtGuard } from '../auth/google-jwt.guard';
import { CarsService } from './cars.service';
import { CreateCarDto, UpdateCarDto } from './dto';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('maker') maker?: string, @Query('status') status?: string) {
    return this.carsService.findAll({ q, maker, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(id);
  }

  @UseGuards(GoogleJwtGuard)
  @Post()
  create(@Body() dto: CreateCarDto) {
    return this.carsService.create(dto);
  }

  @UseGuards(GoogleJwtGuard)
  @Post('recalculate')
  recalculateAll() {
    return this.carsService.recalculateAll();
  }

  @UseGuards(GoogleJwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCarDto) {
    return this.carsService.update(id, dto);
  }

  @UseGuards(GoogleJwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.carsService.remove(id);
  }
}
