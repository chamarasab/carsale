import { Body, Controller, Get, Headers, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { AUCTION_GRADES } from '../cars/auction-grades';
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

class AutomarketImportDto {
  @IsString()
  maker: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsIn(AUCTION_GRADES)
  auctionGrade?: string;

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
  @Max(10)
  listSize?: number;

  @IsOptional()
  @IsBoolean()
  allUpcoming?: boolean;
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

  @Post('automarket')
  importAutomarket(@Body() dto: AutomarketImportDto) {
    return this.scraperService.runAutomarketImport(dto);
  }

  @Get('status')
  status() {
    return this.scraperService.getBotStatus();
  }

  @Post('run')
  run() {
    return this.scraperService.startJpCenterBatch('manual');
  }
}

@Controller('scraper/internal')
export class ScraperInternalController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status(@Headers('x-scraper-service-key') key?: string) {
    this.assertServiceKey(key);
    return this.scraperService.getBotStatus();
  }

  @Post('run')
  run(@Headers('x-scraper-service-key') key?: string) {
    this.assertServiceKey(key);
    return this.scraperService.startJpCenterBatch('scheduled');
  }

  private assertServiceKey(key?: string) {
    const expected = this.config.get<string>('SCRAPER_SERVICE_KEY');
    if (!expected || !key || key !== expected) {
      throw new UnauthorizedException('Invalid scraper service key');
    }
  }
}
