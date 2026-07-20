import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'websitevaluemisses', timestamps: true })
export class WebsiteValueMiss {
  @Prop({ index: true, required: true, type: String, unique: true })
  key: string;

  @Prop({ index: true, required: true, trim: true, type: String })
  maker: string;

  @Prop({ index: true, required: true, trim: true, type: String })
  model: string;

  @Prop({ trim: true, type: String })
  title?: string;

  @Prop({ trim: true, type: String })
  modelCode?: string;

  @Prop({ trim: true, type: String })
  chassisCode?: string;

  @Prop({ trim: true, type: String })
  vehicleGrade?: string;

  @Prop({ trim: true, type: String })
  source?: string;

  @Prop({ trim: true, type: String })
  sourceUrl?: string;

  @Prop({ min: 1, type: Number })
  occurrences: number;

  @Prop({ default: Date.now, required: true, type: Date })
  firstSeenAt: Date;

  @Prop({ default: Date.now, index: true, required: true, type: Date })
  lastSeenAt: Date;

  @Prop({
    default: 'missing',
    enum: ['missing', 'resolved', 'ignored'],
    index: true,
    type: String,
  })
  status: 'missing' | 'resolved' | 'ignored';

  @Prop({ type: Date })
  resolvedAt?: Date;
}

export const WebsiteValueMissSchema =
  SchemaFactory.createForClass(WebsiteValueMiss);

WebsiteValueMissSchema.index({ status: 1, lastSeenAt: -1 });
