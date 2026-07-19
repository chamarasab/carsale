import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AUCTION_GRADES } from './auction-grades';

export class CostBreakdownDto {
  @IsNumber()
  @Min(0)
  auctionPriceJpy: number;

  @IsNumber()
  @Min(0)
  exchangeRateLkr: number;

  @IsOptional()
  @IsString()
  exchangeRateDate?: string;

  @IsOptional()
  @IsString()
  exchangeRateSource?: string;

  @IsOptional()
  @IsString()
  exchangeRateProvider?: string;

  @IsOptional()
  @IsString()
  websiteValueRecordId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  websiteValueNo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueJpy?: number;

  @IsOptional()
  @IsString()
  websiteValueVehicleModel?: string;

  @IsOptional()
  @IsString()
  websiteValueGrade?: string;

  @IsOptional()
  @IsIn(['2WD', '4WD'])
  websiteValueDrivetrain?: '2WD' | '4WD';

  @IsOptional()
  @IsString()
  websiteValueSourceUrl?: string;

  @IsOptional()
  @IsBoolean()
  websiteValueTaxIncluded?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueTaxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueDepreciationRate?: number;

  @IsOptional()
  @IsString()
  websiteValueEffectiveFrom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueNetJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueAssessedFobJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueCifJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  websiteValueCifLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yellowBookValueJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depreciationRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yellowBookFreightJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  invoiceCifJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceCifJpy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceCifLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceTotalLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceExchangeRateLkr?: number;

  @IsOptional()
  @IsString()
  referenceModel?: string;

  @IsOptional()
  @IsString()
  referenceSource?: string;

  @IsOptional()
  @IsString()
  calculationBasis?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  importDutyLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cidRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cidSurchargeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cidBaseLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cidSurchargeLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  exciseRatePerUnitLkr?: number;

  @IsOptional()
  @IsIn(['cc', 'kW'])
  exciseUnit?: 'cc' | 'kW';

  @IsOptional()
  @IsNumber()
  @Min(0)
  exciseDutyLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  luxuryThresholdLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  luxuryRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  luxuryTaxLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vehicleEntitlementLevyLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  comExmSealLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ssclRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ssclLkr?: number;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  engineCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  motorPowerKw?: number;

  @IsOptional()
  @IsInt()
  @Min(1980)
  manufactureYear?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bankChargesLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  clearingChargesLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  supplierCommissionLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  importerCommissionLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  portHandlingLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  localTransportLkr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceFeeLkr?: number;
}

export class CreateCarDto {
  @IsString()
  title: string;

  @IsString()
  maker: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  modelCode?: string;

  @IsOptional()
  @IsString()
  vehicleGrade?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categoryMeaning?: string;

  @IsInt()
  @Min(1980)
  year: number;

  @IsInt()
  @Min(0)
  mileageKm: number;

  @IsString()
  fuelType: string;

  @IsString()
  transmission: string;

  @IsIn(AUCTION_GRADES)
  auctionGrade: string;

  @IsString()
  chassisCode: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  auctionDate?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ValidateNested()
  @Type(() => CostBreakdownDto)
  cost: CostBreakdownDto;

  @IsOptional()
  @IsIn(['available', 'reserved', 'sold'])
  status?: 'available' | 'reserved' | 'sold';

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateCarDto extends PartialType(CreateCarDto) {}
