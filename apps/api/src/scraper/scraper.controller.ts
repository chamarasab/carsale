import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ScraperService } from './scraper.service';

class SourceUrlDto {
  @IsUrl()
  url: string;
}

class JpCenterImportDto {
  @IsOptional()
  @IsString()
  maker?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  yearTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  pages?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  listSize?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('json-feed')
  importJsonFeed(@Body() dto: SourceUrlDto) {
    return this.scraperService.importFromJsonFeed(dto.url);
  }

  @Post('preview-html')
  previewHtml(@Body() dto: SourceUrlDto) {
    return this.scraperService.previewHtmlSource(dto.url);
  }

  @Post('jpcenter')
  importJpCenter(@Body() dto: JpCenterImportDto) {
    return this.scraperService.importFromJpCenter(dto);
  }
}
