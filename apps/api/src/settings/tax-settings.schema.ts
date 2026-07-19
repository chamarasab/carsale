import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaxSettingsDocument = HydratedDocument<TaxSettings>;

@Schema({ _id: false })
export class LuxuryThresholds {
  @Prop({ required: true, type: Number })
  petrol: number;

  @Prop({ required: true, type: Number })
  diesel: number;

  @Prop({ required: true, type: Number })
  hybrid: number;

  @Prop({ required: true, type: Number })
  electric: number;
}

export const LuxuryThresholdsSchema = SchemaFactory.createForClass(LuxuryThresholds);

@Schema({ _id: false })
export class LuxuryBand {
  @Prop({ default: null, type: Number })
  upToExcessLkr: number | null;

  @Prop({ required: true, type: Number })
  rate: number;
}

export const LuxuryBandSchema = SchemaFactory.createForClass(LuxuryBand);

@Schema({ timestamps: true })
export class TaxSettings {
  @Prop({ required: true, unique: true, type: String })
  key: string;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  effectiveFrom: string;

  @Prop({ default: '', type: String })
  notes: string;

  @Prop({ required: true, type: Number })
  cidRate: number;

  @Prop({ required: true, type: Number })
  cidSurchargeRate: number;

  @Prop({ required: true, type: Number })
  vatRate: number;

  @Prop({ required: true, type: Number })
  ssclRate: number;

  @Prop({ required: true, type: Number })
  defaultDepreciationRate: number;

  @Prop({ default: 15000, required: true, type: Number })
  vehicleEntitlementLevyLkr: number;

  @Prop({ required: true, type: Number })
  comExmSealLkr: number;

  @Prop({ required: true, type: LuxuryThresholdsSchema })
  luxuryThresholds: LuxuryThresholds;

  @Prop({ required: true, type: [LuxuryBandSchema] })
  luxuryBands: LuxuryBand[];
}

export const TaxSettingsSchema = SchemaFactory.createForClass(TaxSettings);
