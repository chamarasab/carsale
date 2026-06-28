import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CarsModule } from './cars/cars.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { ScraperModule } from './scraper/scraper.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('MONGODB_DB', 'carsale'),
      }),
    }),
    AuthModule,
    CategoriesModule,
    CarsModule,
    InquiriesModule,
    ScraperModule,
    SettingsModule,
    UsersModule,
    UploadsModule,
  ],
})
export class AppModule {}
