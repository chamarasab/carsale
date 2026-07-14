import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CarsModule } from '../cars/cars.module';
import { MediaModule } from '../media/media.module';
import { SettingsModule } from '../settings/settings.module';
import { ScraperController, ScraperInternalController } from './scraper.controller';
import { ScrapeRun, ScrapeRunSchema } from './scrape-run.schema';
import { ScraperService } from './scraper.service';

@Module({
  imports: [
    AuthModule,
    CarsModule,
    MediaModule,
    SettingsModule,
    MongooseModule.forFeature([{ name: ScrapeRun.name, schema: ScrapeRunSchema }]),
  ],
  controllers: [ScraperController, ScraperInternalController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
