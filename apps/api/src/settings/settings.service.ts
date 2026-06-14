import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DEFAULT_TAX_SETTINGS } from './default-tax-settings';
import { UpdateTaxSettingsDto } from './dto';
import { TaxSettings } from './tax-settings.schema';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(TaxSettings.name) private readonly taxSettingsModel: Model<TaxSettings>) {}

  async getTaxSettings() {
    const existing = await this.taxSettingsModel.findOne({ key: DEFAULT_TAX_SETTINGS.key }).lean();
    if (existing) {
      return existing;
    }

    return this.taxSettingsModel.create(DEFAULT_TAX_SETTINGS);
  }

  async updateTaxSettings(dto: UpdateTaxSettingsDto) {
    return this.taxSettingsModel
      .findOneAndUpdate(
        { key: DEFAULT_TAX_SETTINGS.key },
        { ...dto, key: DEFAULT_TAX_SETTINGS.key },
        { new: true, upsert: true },
      )
      .lean();
  }
}
