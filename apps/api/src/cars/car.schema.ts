import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CarDocument = HydratedDocument<Car>;

@Schema({ _id: false })
export class CostBreakdown {
  @Prop({ required: true, type: Number })
  auctionPriceJpy: number;

  @Prop({ required: true, type: Number })
  exchangeRateLkr: number;

  @Prop({ type: String })
  exchangeRateDate?: string;

  @Prop({ type: String })
  exchangeRateSource?: string;

  @Prop({ type: String })
  exchangeRateProvider?: string;

  @Prop({ type: Number })
  yellowBookValueJpy?: number;

  @Prop({ type: Number })
  depreciationRate?: number;

  @Prop({ type: Number })
  freightJpy?: number;

  @Prop({ type: Number })
  yellowBookFreightJpy?: number;

  @Prop({ type: Number })
  insuranceJpy?: number;

  @Prop({ type: Number })
  invoiceCifJpy?: number;

  @Prop({ type: Number })
  referenceCifJpy?: number;

  @Prop({ type: Number })
  referenceTotalLkr?: number;

  @Prop({ type: Number })
  referenceExchangeRateLkr?: number;

  @Prop({ type: String })
  referenceModel?: string;

  @Prop({ type: String })
  referenceSource?: string;

  @Prop({ type: String })
  calculationBasis?: string;

  @Prop({ required: true, type: Number })
  auctionPriceLkr: number;

  @Prop({ type: Number })
  invoiceCifLkr?: number;

  @Prop({ type: Number })
  yellowBookCifLkr?: number;

  @Prop({ type: Number })
  taxableCifLkr?: number;

  @Prop({ type: String })
  taxableCifSource?: string;

  @Prop({ required: true, type: Number })
  shippingLkr: number;

  @Prop({ required: true, type: Number })
  insuranceLkr: number;

  @Prop({ type: Number })
  cidRate?: number;

  @Prop({ type: Number })
  cidSurchargeRate?: number;

  @Prop({ type: Number })
  cidBaseLkr?: number;

  @Prop({ type: Number })
  cidSurchargeLkr?: number;

  @Prop({ type: Number })
  exciseRatePerUnitLkr?: number;

  @Prop({ enum: ['cc', 'kW'], type: String })
  exciseUnit?: 'cc' | 'kW';

  @Prop({ type: Number })
  exciseDutyLkr?: number;

  @Prop({ type: Number })
  luxuryThresholdLkr?: number;

  @Prop({ type: Number })
  luxuryRate?: number;

  @Prop({ type: Number })
  luxuryTaxLkr?: number;

  @Prop({ type: Number })
  vehicleEntitlementLevyLkr?: number;

  @Prop({ type: Number })
  comExmSealLkr?: number;

  @Prop({ type: Number })
  ssclRate?: number;

  @Prop({ type: Number })
  ssclLkr?: number;

  @Prop({ required: true, type: Number })
  importDutyLkr: number;

  @Prop({ required: true, type: Number })
  vatLkr: number;

  @Prop({ type: Number })
  vatRate?: number;

  @Prop({ type: String })
  vehicleType?: string;

  @Prop({ type: String })
  fuelType?: string;

  @Prop({ type: Number })
  engineCapacity?: number;

  @Prop({ type: Number })
  motorPowerKw?: number;

  @Prop({ type: Number })
  manufactureYear?: number;

  @Prop({ type: Number })
  bankChargesLkr?: number;

  @Prop({ type: Number })
  clearingChargesLkr?: number;

  @Prop({ type: Number })
  supplierCommissionLkr?: number;

  @Prop({ type: Number })
  importerCommissionLkr?: number;

  @Prop({ type: Number })
  depositLkr?: number;

  @Prop({ type: Number })
  totalOtherCostsLkr?: number;

  @Prop({ type: String })
  taxPolicyName?: string;

  @Prop({ type: String })
  taxPolicyEffectiveFrom?: string;

  @Prop({ required: true, type: Number })
  portHandlingLkr: number;

  @Prop({ required: true, type: Number })
  localTransportLkr: number;

  @Prop({ required: true, type: Number })
  serviceFeeLkr: number;

  @Prop({ required: true, type: Number })
  totalLkr: number;
}

export const CostBreakdownSchema = SchemaFactory.createForClass(CostBreakdown);

@Schema({ timestamps: true })
export class Car {
  @Prop({ required: true, trim: true, type: String })
  title: string;

  @Prop({ required: true, trim: true, type: String })
  maker: string;

  @Prop({ required: true, trim: true, type: String })
  model: string;

  @Prop({ trim: true, uppercase: true, type: String })
  modelCode?: string;

  @Prop({ trim: true, type: String })
  categoryId?: string;

  @Prop({ trim: true, type: String })
  categoryMeaning?: string;

  @Prop({ required: true, type: Number })
  year: number;

  @Prop({ required: true, type: Number })
  mileageKm: number;

  @Prop({ required: true, trim: true, type: String })
  fuelType: string;

  @Prop({ required: true, trim: true, type: String })
  transmission: string;

  @Prop({ required: true, trim: true, type: String })
  auctionGrade: string;

  @Prop({ required: true, trim: true, type: String })
  chassisCode: string;

  @Prop({ required: true, trim: true, type: String })
  location: string;

  @Prop({ default: 'Japan Auction', trim: true, type: String })
  source: string;

  @Prop({ trim: true, type: String })
  sourceUrl?: string;

  @Prop({ required: true, type: [String] })
  images: string[];

  @Prop({ required: true, type: [String] })
  features: string[];

  @Prop({ required: true, type: CostBreakdownSchema })
  cost: CostBreakdown;

  @Prop({ enum: ['available', 'reserved', 'sold'], default: 'available', type: String })
  status: 'available' | 'reserved' | 'sold';

  @Prop({ default: true, type: Boolean })
  published: boolean;
}

export const CarSchema = SchemaFactory.createForClass(Car);

CarSchema.index({ maker: 1, model: 1, year: -1, published: 1 });
CarSchema.index({ modelCode: 1, published: 1 });
CarSchema.index({ title: 'text', maker: 'text', model: 'text', modelCode: 'text', chassisCode: 'text' });
