import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CustomerHandover, CustomerHandoverSchema } from './customer-handover.schema';
import { CustomerHandoversController } from './customer-handovers.controller';
import { CustomerHandoversService } from './customer-handovers.service';

@Module({
  imports: [
    AuthModule,
    MediaModule,
    UploadsModule,
    MongooseModule.forFeature([{ name: CustomerHandover.name, schema: CustomerHandoverSchema }]),
  ],
  controllers: [CustomerHandoversController],
  providers: [CustomerHandoversService],
})
export class CustomerHandoversModule {}
