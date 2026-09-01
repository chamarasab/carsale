import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerHandoverDocument = HydratedDocument<CustomerHandover>;

@Schema({ collection: 'customerhandovers', timestamps: true })
export class CustomerHandover {
  @Prop({ required: true, trim: true, type: String })
  imageUrl: string;
}

export const CustomerHandoverSchema = SchemaFactory.createForClass(CustomerHandover);

CustomerHandoverSchema.index({ createdAt: -1, _id: -1 });
