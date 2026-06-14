import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InquiryDocument = HydratedDocument<Inquiry>;

@Schema({ timestamps: true })
export class Inquiry {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Car' })
  carId: Types.ObjectId;

  @Prop({ required: true, trim: true, type: String })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, type: String })
  email: string;

  @Prop({ required: true, trim: true, type: String })
  phone: string;

  @Prop({ trim: true, type: String })
  message?: string;

  @Prop({ enum: ['new', 'contacted', 'closed'], default: 'new', type: String })
  status: 'new' | 'contacted' | 'closed';
}

export const InquirySchema = SchemaFactory.createForClass(Inquiry);
InquirySchema.index({ carId: 1, createdAt: -1 });
