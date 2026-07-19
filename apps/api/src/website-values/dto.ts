import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWebsiteValueDto {
  @IsInt()
  @Min(1)
  no: number;

  @IsString()
  key: string;

  @IsString()
  maker: string;

  @IsString()
  model: string;

  @IsString()
  vehicleModel: string;

  @IsString()
  vehicleGrade: string;

  @IsArray()
  @IsString({ each: true })
  aliases: string[];

  @IsIn(['2WD', '4WD'])
  drivetrain: '2WD' | '4WD';

  @IsArray()
  @IsString({ each: true })
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

  @IsString()
  sourceUrl: string;

  @IsOptional()
  @IsString()
  sourceDataUrl?: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateWebsiteValueDto extends PartialType(CreateWebsiteValueDto) {}
