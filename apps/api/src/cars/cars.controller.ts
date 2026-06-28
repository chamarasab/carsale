import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthUser } from '../auth/auth.types';
import { CarsService } from './cars.service';
import { CreateCarDto, UpdateCarDto } from './dto';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('maker') maker?: string, @Query('status') status?: string) {
    return this.carsService.findAll({ q, maker, status });
  }

  @UseGuards(JwtAuthGuard)
  @Get('manage')
  findManageable(@Req() request: Request & { user: AuthUser }) {
    return this.carsService.findManageable(request.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('pending')
  findPending() {
    return this.carsService.findPending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateCarDto, @Req() request: Request & { user: AuthUser }) {
    return this.carsService.create(dto, request.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('recalculate')
  recalculateAll() {
    return this.carsService.recalculateAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCarDto, @Req() request: Request & { user: AuthUser }) {
    return this.carsService.update(id, dto, request.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/published')
  setPublished(@Param('id') id: string, @Body() dto: { published: boolean }) {
    return this.carsService.setPublished(id, dto.published);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: Request & { user: AuthUser }) {
    return this.carsService.remove(id, request.user);
  }
}
