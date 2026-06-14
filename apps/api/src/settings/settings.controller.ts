import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { GoogleJwtGuard } from '../auth/google-jwt.guard';
import { UpdateTaxSettingsDto } from './dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('tax')
  getTaxSettings() {
    return this.settingsService.getTaxSettings();
  }

  @UseGuards(GoogleJwtGuard)
  @Patch('tax')
  updateTaxSettings(@Body() dto: UpdateTaxSettingsDto) {
    return this.settingsService.updateTaxSettings(dto);
  }
}
