import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GoogleJwtGuard } from '../auth/google-jwt.guard';
import { CreateInquiryDto } from './dto';
import { InquiriesService } from './inquiries.service';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  create(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(dto);
  }

  @UseGuards(GoogleJwtGuard)
  @Get()
  findAll() {
    return this.inquiriesService.findAll();
  }
}
