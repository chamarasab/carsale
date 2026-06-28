import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateTaxSettingsDto } from './dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('tax')
  getTaxSettings() {
    return this.settingsService.getTaxSettings();
  }

  @Get('exchange-rate')
  getExchangeRate() {
    return this.settingsService.getJpyToLkrRate();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('tax')
  updateTaxSettings(@Body() dto: UpdateTaxSettingsDto) {
    return this.settingsService.updateTaxSettings(dto);
  }
}
