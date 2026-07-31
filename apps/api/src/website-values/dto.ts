import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWebsiteValueDto {
  @IsInt()
  @Min(1)
  no: number;

  @IsString()
  @MaxLength(160)
  key: string;

  @IsString()
  @MaxLength(60)
  maker: string;

  @IsString()
  @MaxLength(80)
  model: string;

  @IsString()
  @MaxLength(120)
  vehicleModel: string;

  @IsString()
  @MaxLength(120)
  vehicleGrade: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  aliases: string[];

  @IsIn(['2WD', '4WD'])
  drivetrain: '2WD' | '4WD';

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  modelCodes: string[];

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsIn(['JPY'])
  currency?: 'JPY';

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consumptionTaxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customsDepreciationRate?: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  sourceUrl: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  sourceDataUrl?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateWebsiteValueDto extends PartialType(CreateWebsiteValueDto) {}
