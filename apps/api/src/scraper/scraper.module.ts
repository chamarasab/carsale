import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CarsModule } from '../cars/cars.module';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [AuthModule, CarsModule],
  controllers: [ScraperController],
  providers: [ScraperService],
})
export class ScraperModule {}
