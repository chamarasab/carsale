import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleCategoryDto {
  @IsString()
  code: string;

  @IsString()
  meaning: string;

  @IsOptional()
  @IsString()
  maker?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grades?: string[];

  @IsOptional()
  @IsInt()
  @Min(1980)
  yearFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(1980)
  yearTo?: number;

  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  driveType?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  engineCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDepreciationRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultExciseRatePerUnitLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultExciseDutyLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultLuxuryThresholdLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultLuxuryRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceRefs?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateVehicleCategoryDto extends PartialType(CreateVehicleCategoryDto) {}
