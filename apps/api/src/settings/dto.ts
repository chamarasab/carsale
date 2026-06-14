import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class LuxuryThresholdsDto {
  @IsNumber()
  @Min(0)
  petrol: number;

  @IsNumber()
  @Min(0)
  diesel: number;

  @IsNumber()
  @Min(0)
  hybrid: number;

  @IsNumber()
  @Min(0)
  electric: number;
}

class LuxuryBandDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  upToExcessLkr: number | null;

  @IsNumber()
  @Min(0)
  rate: number;
}

export class UpdateTaxSettingsDto {
  @IsString()
  name: string;

  @IsString()
  effectiveFrom: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  @Min(0)
  cidRate: number;

  @IsNumber()
  @Min(0)
  cidSurchargeRate: number;

  @IsNumber()
  @Min(0)
  vatRate: number;

  @IsNumber()
  @Min(0)
  ssclRate: number;

  @IsNumber()
  @Min(0)
  defaultDepreciationRate: number;

  @IsNumber()
  @Min(0)
  comExmSealLkr: number;

  @ValidateNested()
  @Type(() => LuxuryThresholdsDto)
  luxuryThresholds: LuxuryThresholdsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LuxuryBandDto)
  luxuryBands: LuxuryBandDto[];
}
