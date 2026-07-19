import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WebsiteValueDocument = HydratedDocument<WebsiteValue>;

@Schema({ collection: 'websitevalues', timestamps: true })
export class WebsiteValue {
  @Prop({ index: true, required: true, type: Number, unique: true })
  no: number;

  @Prop({
    index: true,
    lowercase: true,
    required: true,
    trim: true,
    type: String,
    unique: true,
  })
  key: string;

  @Prop({ index: true, required: true, trim: true, type: String })
  maker: string;

  @Prop({ index: true, required: true, trim: true, type: String })
  model: string;

  @Prop({ required: true, trim: true, type: String })
  vehicleModel: string;

  @Prop({ required: true, trim: true, type: String })
  vehicleGrade: string;

  @Prop({ default: [], type: [String] })
  aliases: string[];

  @Prop({ enum: ['2WD', '4WD'], required: true, type: String })
  drivetrain: '2WD' | '4WD';

  @Prop({ default: [], type: [String] })
  modelCodes: string[];

  @Prop({ min: 0, required: true, type: Number })
  price: number;

  @Prop({ default: 'JPY', enum: ['JPY'], type: String })
  currency: 'JPY';

  @Prop({ default: true, type: Boolean })
  taxIncluded: boolean;

  @Prop({ default: 0.1, min: 0, type: Number })
  consumptionTaxRate: number;

  @Prop({ default: 0.85, min: 0, type: Number })
  customsDepreciationRate: number;

  @Prop({ required: true, trim: true, type: String })
  sourceUrl: string;

  @Prop({ trim: true, type: String })
  sourceDataUrl?: string;

  @Prop({ trim: true, type: String })
  effectiveFrom?: string;

  @Prop({ type: Date })
  lastSyncedAt?: Date;

  @Prop({ default: true, type: Boolean })
  active: boolean;
}

export const WebsiteValueSchema = SchemaFactory.createForClass(WebsiteValue);

WebsiteValueSchema.index({ maker: 1, model: 1, active: 1 });
WebsiteValueSchema.index({ modelCodes: 1, active: 1 });
