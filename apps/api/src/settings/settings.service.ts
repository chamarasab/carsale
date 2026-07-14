import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as cheerio from 'cheerio';
import { Model } from 'mongoose';
import { DEFAULT_TAX_SETTINGS } from './default-tax-settings';
import { UpdateTaxSettingsDto } from './dto';
import { TaxSettings } from './tax-settings.schema';

const CBSL_JPY_RATE_URL = 'https://www.cbsl.gov.lk/cbsl_custom/charts/jpy/indexsmall.php';

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
      const response = await fetch(CBSL_JPY_RATE_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);

      const html = await response.text();
      const rate = this.parseCbslJpySellingRate(html);
      if (!rate) throw new Error('CBSL JPY selling rate is missing');

      return {
        base: 'JPY',
        quote: 'LKR',
        rate,
        date: new Date().toISOString().slice(0, 10),
        provider: 'Central Bank of Sri Lanka',
        source: CBSL_JPY_RATE_URL,
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

  private parseCbslJpySellingRate(html: string) {
    const $ = cheerio.load(html);
    const sellText = $('p')
      .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
      .get()
      .find((text) => /^Sell\b/i.test(text));
    const match = sellText?.match(/(\d+(?:\.\d+)?)/);
    const rate = match ? Number(match[1]) : Number.NaN;
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }
}
