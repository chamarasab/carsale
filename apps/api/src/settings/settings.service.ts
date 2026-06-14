import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DEFAULT_TAX_SETTINGS } from './default-tax-settings';
import { UpdateTaxSettingsDto } from './dto';
import { TaxSettings } from './tax-settings.schema';

const JPY_TO_LKR_RATE_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json';

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

  async getJpyToLkrRate() {
    const fallbackRate = Number(process.env.JPY_TO_LKR || 2.08);

    try {
      const response = await fetch(JPY_TO_LKR_RATE_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);

      const payload = (await response.json()) as { date?: string; jpy?: { lkr?: number } };
      const rate = payload.jpy?.lkr;
      if (!rate || !Number.isFinite(rate)) throw new Error('JPY to LKR rate is missing');

      return {
        base: 'JPY',
        quote: 'LKR',
        rate,
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        provider: 'fawazahmed0 currency-api',
        source: JPY_TO_LKR_RATE_URL,
        fallback: false,
      };
    } catch {
      return {
        base: 'JPY',
        quote: 'LKR',
        rate: fallbackRate,
        date: new Date().toISOString().slice(0, 10),
        provider: 'Environment fallback',
        source: 'JPY_TO_LKR',
        fallback: true,
      };
    }
  }
}
