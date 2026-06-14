import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VehicleCategoryDocument = HydratedDocument<VehicleCategory>;

@Schema({ timestamps: true })
export class VehicleCategory {
  @Prop({ required: true, trim: true, uppercase: true, unique: true, type: String })
  code: string;

  @Prop({ required: true, trim: true, type: String })
  meaning: string;

  @Prop({ trim: true, type: String })
  maker?: string;

  @Prop({ trim: true, type: String })
  model?: string;

  @Prop({ type: [String], default: [] })
  grades?: string[];

  @Prop({ type: Number })
  yearFrom?: number;

  @Prop({ type: Number })
  yearTo?: number;

  @Prop({ trim: true, type: String })
  bodyType?: string;

  @Prop({ trim: true, type: String })
  vehicleType?: string;

  @Prop({ trim: true, type: String })
  fuelType?: string;

  @Prop({ trim: true, type: String })
  driveType?: string;

  @Prop({ trim: true, type: String })
  transmission?: string;

  @Prop({ type: Number })
  engineCapacity?: number;

  @Prop({ type: Number })
  defaultDepreciationRate?: number;

  @Prop({ type: Number })
  defaultExciseRatePerUnitLkr?: number;

  @Prop({ type: Number })
  defaultExciseDutyLkr?: number;

  @Prop({ type: Number })
  defaultLuxuryThresholdLkr?: number;

  @Prop({ type: Number })
  defaultLuxuryRate?: number;

  @Prop({ trim: true, type: String })
  notes?: string;

  @Prop({ type: [String], default: [] })
  sourceRefs?: string[];

  @Prop({ default: true, type: Boolean })
  active: boolean;
}

export const VehicleCategorySchema = SchemaFactory.createForClass(VehicleCategory);

VehicleCategorySchema.index({ maker: 1, model: 1, active: 1 });
VehicleCategorySchema.index({ yearFrom: 1, yearTo: 1 });
