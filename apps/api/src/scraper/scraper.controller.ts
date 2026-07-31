import { Body, Controller, Get, Headers, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { timingSafeEqual } from 'node:crypto';
import { AUCTION_GRADES } from '../cars/auction-grades';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ScraperService } from './scraper.service';

class JpCenterImportDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  maker?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
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
  @MaxLength(60)
  maker: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}$/)
  lotId?: string;

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

  @Post('jpcenter')
  importJpCenter(@Body() dto: JpCenterImportDto) {
    return this.scraperService.importFromJpCenter(dto);
  }

  @Post('automarket')
  importAutomarket(@Body() dto: AutomarketImportDto) {
    return this.scraperService.startAutomarketImport(dto);
  }

  @Get('status')
  status() {
    return this.scraperService.getBotStatus();
  }

  @Post('run')
  run() {
    return this.scraperService.startAutomarketBatch('manual');
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
    return this.scraperService.startAutomarketBatch('scheduled');
  }

  @Post('automarket')
  importAutomarket(
    @Body() dto: AutomarketImportDto,
    @Headers('x-scraper-service-key') key?: string,
  ) {
    this.assertServiceKey(key);
    return this.scraperService.startAutomarketImport(dto);
  }

  private assertServiceKey(key?: string) {
    const expected = this.config.get<string>('SCRAPER_SERVICE_KEY');
    const suppliedBuffer = Buffer.from(key ?? '');
    const expectedBuffer = Buffer.from(expected ?? '');
    const matches =
      suppliedBuffer.length === expectedBuffer.length &&
      suppliedBuffer.length > 0 &&
      timingSafeEqual(suppliedBuffer, expectedBuffer);
    if (!matches) {
      throw new UnauthorizedException('Invalid scraper service key');
    }
  }
}
