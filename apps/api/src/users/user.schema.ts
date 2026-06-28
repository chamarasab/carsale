import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type UserRole = 'ADMIN' | 'USER';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true, type: String })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, type: String })
  email: string;

  @Prop({ select: false, type: String })
  passwordHash?: string;

  @Prop({ sparse: true, type: String, unique: true })
  googleSubject?: string;

  @Prop({ enum: ['ADMIN', 'USER'], default: 'USER', required: true, type: String })
  role: UserRole;

  @Prop({ default: true, type: Boolean })
  active: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'ADMIN' } });
