import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TaxSettings, TaxSettingsSchema } from './tax-settings.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: TaxSettings.name, schema: TaxSettingsSchema }]), AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
