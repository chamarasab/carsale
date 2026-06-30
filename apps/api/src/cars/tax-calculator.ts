import { calculateTotalLkr, toLkr } from '../common/money';
import { DEFAULT_TAX_SETTINGS, TaxSettingsValue } from '../settings/default-tax-settings';
import { CreateCarDto } from './dto';

type TaxSettingsLike = Partial<TaxSettingsValue>;

export function calculateImportCost(cost: CreateCarDto['cost'], settings: TaxSettingsLike = DEFAULT_TAX_SETTINGS) {
  if (isCommercialVanCost(cost)) {
    return calculateCommercialVanCost(cost, settings);
  }

  const exchangeRateLkr = cost.exchangeRateLkr;
  const auctionPriceLkr = toLkr(cost.auctionPriceJpy * exchangeRateLkr);
  const freightJpy = cost.freightJpy ?? 0;
  const insuranceJpy = cost.insuranceJpy ?? 0;
  const shippingLkr = cost.shippingLkr ?? toLkr(freightJpy * exchangeRateLkr);
  const insuranceLkr = cost.insuranceLkr ?? toLkr(insuranceJpy * exchangeRateLkr);

  const invoiceCifJpy = cost.invoiceCifJpy ?? cost.auctionPriceJpy + freightJpy + insuranceJpy;
  const invoiceCifLkr = toLkr(invoiceCifJpy * exchangeRateLkr);
  const yellowBookFreightJpy = cost.yellowBookFreightJpy ?? freightJpy;
  const yellowBookCifLkr = cost.yellowBookValueJpy
    ? toLkr(
        ((cost.yellowBookValueJpy * 100) / 110) *
          (cost.depreciationRate ?? settings.defaultDepreciationRate ?? DEFAULT_TAX_SETTINGS.defaultDepreciationRate) *
          exchangeRateLkr +
          yellowBookFreightJpy * exchangeRateLkr +
          insuranceLkr,
      )
    : invoiceCifLkr;
  const referenceCifLkr = cost.referenceCifJpy
    ? toLkr(cost.referenceCifJpy * exchangeRateLkr)
    : 0;
  const taxableCifLkr = Math.max(invoiceCifLkr, yellowBookCifLkr, referenceCifLkr);
  const taxableCifSource =
    taxableCifLkr === referenceCifLkr
      ? 'workbook-reference'
      : taxableCifLkr === yellowBookCifLkr
        ? 'yellow-book'
        : 'invoice';

  const cidRate = cost.cidRate ?? settings.cidRate ?? DEFAULT_TAX_SETTINGS.cidRate;
  const cidSurchargeRate =
    cost.cidSurchargeRate ?? settings.cidSurchargeRate ?? DEFAULT_TAX_SETTINGS.cidSurchargeRate;
  const vatRate = cost.vatRate ?? settings.vatRate ?? DEFAULT_TAX_SETTINGS.vatRate;
  const ssclRate = cost.ssclRate ?? settings.ssclRate ?? DEFAULT_TAX_SETTINGS.ssclRate;
  const luxuryThresholdLkr = cost.luxuryThresholdLkr ?? defaultLuxuryThreshold(cost.fuelType, settings);
  const luxuryRate =
    cost.luxuryRate ??
    defaultLuxuryRate(taxableCifLkr, luxuryThresholdLkr, cost.fuelType, settings);

  const cidBaseLkr = cost.cidBaseLkr ?? toLkr(taxableCifLkr * cidRate);
  const cidSurchargeLkr = cost.cidSurchargeLkr ?? toLkr(cidBaseLkr * cidSurchargeRate);
  const luxuryTaxLkr = cost.luxuryTaxLkr ?? toLkr(Math.max(0, taxableCifLkr - luxuryThresholdLkr) * luxuryRate);
  const vehicleEntitlementLevyLkr = cost.vehicleEntitlementLevyLkr ?? 0;
  const comExmSealLkr = cost.comExmSealLkr ?? settings.comExmSealLkr ?? DEFAULT_TAX_SETTINGS.comExmSealLkr;
  const bankChargesLkr = cost.bankChargesLkr ?? 0;
  const clearingChargesLkr = cost.clearingChargesLkr ?? cost.portHandlingLkr ?? 0;
  const supplierCommissionLkr = cost.supplierCommissionLkr ?? 0;
  const importerCommissionLkr = cost.importerCommissionLkr ?? cost.serviceFeeLkr ?? 0;
  const depositLkr = cost.depositLkr ?? 0;
  const localTransportLkr = cost.localTransportLkr ?? 0;
  const defaultExcise = calculatePassengerCarExcise(cost);
  const exciseRatePerUnitLkr = cost.exciseRatePerUnitLkr ?? defaultExcise.ratePerUnitLkr;
  const exciseUnit = cost.exciseUnit ?? defaultExcise.unit;
  const exciseQuantity =
    exciseUnit === 'kW' ? (cost.motorPowerKw ?? 0) : (cost.engineCapacity ?? 0);
  const baseExciseDutyLkr = toLkr(
    cost.exciseRatePerUnitLkr !== undefined
      ? exciseQuantity * cost.exciseRatePerUnitLkr
      : defaultExcise.dutyLkr,
  );
  const solvedReferenceExciseDutyLkr = referenceExciseDutyLkr(cost, {
    invoiceCifLkr,
    taxableCifLkr,
    cidBaseLkr,
    cidSurchargeLkr,
    luxuryTaxLkr,
    vehicleEntitlementLevyLkr,
    comExmSealLkr,
    vatRate,
    ssclRate,
    bankChargesLkr,
    clearingChargesLkr,
    supplierCommissionLkr,
    importerCommissionLkr,
    depositLkr,
    localTransportLkr,
    fallbackExciseDutyLkr: baseExciseDutyLkr,
  });
  const useReferenceExcise = Boolean(cost.referenceTotalLkr && defaultExcise.dutyLkr === 0);
  const exciseDutyLkr =
    cost.exciseDutyLkr ??
    (useReferenceExcise ? solvedReferenceExciseDutyLkr : baseExciseDutyLkr);
  const consumptionTaxBaseLkr =
    taxableCifLkr * 1.1 + cidBaseLkr + cidSurchargeLkr + exciseDutyLkr;
  const vatLkr = cost.vatLkr ?? toLkr(consumptionTaxBaseLkr * vatRate);
  const ssclLkr = cost.ssclLkr ?? toLkr(consumptionTaxBaseLkr * ssclRate);
  const importDutyLkr = calculateTotalLkr({
    cidBaseLkr,
    cidSurchargeLkr,
    exciseDutyLkr,
    luxuryTaxLkr,
    vatLkr,
    ssclLkr,
    vehicleEntitlementLevyLkr,
    comExmSealLkr,
  });

  const portHandlingLkr = cost.portHandlingLkr ?? clearingChargesLkr;
  const serviceFeeLkr = cost.serviceFeeLkr ?? importerCommissionLkr;
  const totalOtherCostsLkr = calculateTotalLkr({
    bankChargesLkr,
    clearingChargesLkr,
    supplierCommissionLkr,
    importerCommissionLkr,
    depositLkr,
    localTransportLkr,
  });

  return {
    ...cost,
    auctionPriceLkr,
    freightJpy,
    yellowBookFreightJpy,
    insuranceJpy,
    shippingLkr,
    insuranceLkr,
    invoiceCifJpy,
    invoiceCifLkr,
    referenceCifLkr,
    yellowBookCifLkr,
    taxableCifLkr,
    taxableCifSource,
    cidRate,
    cidSurchargeRate,
    vatRate,
    ssclRate,
    luxuryThresholdLkr,
    luxuryRate,
    cidBaseLkr,
    cidSurchargeLkr,
    exciseRatePerUnitLkr,
    exciseUnit,
    exciseDutyLkr,
    luxuryTaxLkr,
    vehicleEntitlementLevyLkr,
    comExmSealLkr,
    vatLkr,
    ssclLkr,
    importDutyLkr,
    bankChargesLkr,
    clearingChargesLkr,
    supplierCommissionLkr,
    importerCommissionLkr,
    depositLkr,
    portHandlingLkr,
    localTransportLkr,
    serviceFeeLkr,
    totalOtherCostsLkr,
    taxPolicyName: settings.name ?? DEFAULT_TAX_SETTINGS.name,
    taxPolicyEffectiveFrom: settings.effectiveFrom ?? DEFAULT_TAX_SETTINGS.effectiveFrom,
    totalLkr: calculateTotalLkr({
      invoiceCifLkr,
      importDutyLkr,
      totalOtherCostsLkr,
    }),
  };
}

export function prepareCostForRecalculation(cost: CreateCarDto['cost']): CreateCarDto['cost'] {
  const {
    cidRate: _cidRate,
    cidSurchargeRate: _cidSurchargeRate,
    vatRate: _vatRate,
    ssclRate: _ssclRate,
    cidBaseLkr: _cidBaseLkr,
    cidSurchargeLkr: _cidSurchargeLkr,
    exciseRatePerUnitLkr: _exciseRatePerUnitLkr,
    exciseUnit: _exciseUnit,
    exciseDutyLkr: _exciseDutyLkr,
    luxuryThresholdLkr: _luxuryThresholdLkr,
    luxuryRate: _luxuryRate,
    luxuryTaxLkr: _luxuryTaxLkr,
    vatLkr: _vatLkr,
    ssclLkr: _ssclLkr,
    importDutyLkr: _importDutyLkr,
    ...input
  } = cost;

  return input;
}

function calculateCommercialVanCost(cost: CreateCarDto['cost'], settings: TaxSettingsLike) {
  const exchangeRateLkr = cost.exchangeRateLkr;
  const auctionPriceLkr = toLkr(cost.auctionPriceJpy * exchangeRateLkr);
  const freightJpy = cost.freightJpy ?? 0;
  const insuranceJpy = cost.insuranceJpy ?? 0;
  const shippingLkr = cost.shippingLkr ?? toLkr(freightJpy * exchangeRateLkr);
  const insuranceLkr = cost.insuranceLkr ?? toLkr(insuranceJpy * exchangeRateLkr);
  const invoiceCifJpy = cost.invoiceCifJpy ?? cost.auctionPriceJpy + freightJpy;
  const invoiceCifLkr = toLkr(invoiceCifJpy * exchangeRateLkr);
  const depreciationRate = cost.depreciationRate ?? settings.defaultDepreciationRate ?? DEFAULT_TAX_SETTINGS.defaultDepreciationRate;
  const yellowBookFreightJpy = cost.yellowBookFreightJpy ?? freightJpy;
  const yellowBookCifLkr = cost.yellowBookValueJpy
    ? toLkr((((cost.yellowBookValueJpy * 100) / 110) * depreciationRate + yellowBookFreightJpy + insuranceJpy) * exchangeRateLkr)
    : invoiceCifLkr;
  const taxableCifLkr = Math.max(invoiceCifLkr, yellowBookCifLkr);
  const taxableCifSource = taxableCifLkr === yellowBookCifLkr ? 'yellow-book' : 'invoice';
  const cidRate = cost.cidRate ?? settings.cidRate ?? DEFAULT_TAX_SETTINGS.cidRate;
  const cidSurchargeRate = cost.cidSurchargeRate ?? settings.cidSurchargeRate ?? DEFAULT_TAX_SETTINGS.cidSurchargeRate;
  const vatRate = cost.vatRate ?? settings.vatRate ?? DEFAULT_TAX_SETTINGS.vatRate;
  const ssclRate = cost.ssclRate ?? 0;
  const luxuryThresholdLkr = cost.luxuryThresholdLkr ?? defaultLuxuryThreshold(cost.fuelType, settings);
  const luxuryRate =
    cost.luxuryRate ??
    defaultLuxuryRate(taxableCifLkr, luxuryThresholdLkr, cost.fuelType, settings);
  const cidBaseLkr = cost.cidBaseLkr ?? toLkr(taxableCifLkr * cidRate);
  const cidSurchargeLkr = cost.cidSurchargeLkr ?? toLkr(cidBaseLkr * cidSurchargeRate);
  const exciseDutyLkr =
    cost.exciseDutyLkr ??
    toLkr((cost.engineCapacity ?? 0) * (cost.exciseRatePerUnitLkr ?? 0));
  const luxuryTaxLkr = cost.luxuryTaxLkr ?? toLkr(Math.max(0, taxableCifLkr - luxuryThresholdLkr) * luxuryRate);
  const vatLkr = cost.vatLkr ?? toLkr((taxableCifLkr * 1.1 + cidBaseLkr + cidSurchargeLkr + exciseDutyLkr) * vatRate);
  const consumptionTaxBaseLkr =
    taxableCifLkr * 1.1 + cidBaseLkr + cidSurchargeLkr + exciseDutyLkr;
  const ssclLkr = cost.ssclLkr ?? toLkr(consumptionTaxBaseLkr * ssclRate);
  const vehicleEntitlementLevyLkr = cost.vehicleEntitlementLevyLkr ?? 0;
  const comExmSealLkr = cost.comExmSealLkr ?? settings.comExmSealLkr ?? DEFAULT_TAX_SETTINGS.comExmSealLkr;
  const importDutyLkr = calculateTotalLkr({
    cidBaseLkr,
    cidSurchargeLkr,
    exciseDutyLkr,
    luxuryTaxLkr,
    vatLkr,
    ssclLkr,
    vehicleEntitlementLevyLkr,
    comExmSealLkr,
  });
  const bankChargesLkr = cost.bankChargesLkr ?? 0;
  const clearingChargesLkr = cost.clearingChargesLkr ?? cost.portHandlingLkr ?? 0;
  const supplierCommissionLkr = cost.supplierCommissionLkr ?? 0;
  const importerCommissionLkr = cost.importerCommissionLkr ?? cost.serviceFeeLkr ?? 0;
  const depositLkr = cost.depositLkr ?? 0;
  const portHandlingLkr = cost.portHandlingLkr ?? clearingChargesLkr;
  const localTransportLkr = cost.localTransportLkr ?? 0;
  const serviceFeeLkr = cost.serviceFeeLkr ?? importerCommissionLkr;
  const totalOtherCostsLkr = calculateTotalLkr({
    bankChargesLkr,
    clearingChargesLkr,
    supplierCommissionLkr,
    importerCommissionLkr,
    depositLkr,
    localTransportLkr,
  });

  return {
    ...cost,
    auctionPriceLkr,
    freightJpy,
    yellowBookFreightJpy,
    insuranceJpy,
    shippingLkr,
    insuranceLkr,
    invoiceCifJpy,
    invoiceCifLkr,
    yellowBookCifLkr,
    taxableCifLkr,
    taxableCifSource,
    cidRate,
    cidSurchargeRate,
    vatRate,
    ssclRate,
    luxuryThresholdLkr,
    luxuryRate,
    cidBaseLkr,
    cidSurchargeLkr,
    exciseDutyLkr,
    luxuryTaxLkr,
    vehicleEntitlementLevyLkr,
    comExmSealLkr,
    vatLkr,
    ssclLkr,
    importDutyLkr,
    bankChargesLkr,
    clearingChargesLkr,
    supplierCommissionLkr,
    importerCommissionLkr,
    depositLkr,
    portHandlingLkr,
    localTransportLkr,
    serviceFeeLkr,
    totalOtherCostsLkr,
    taxPolicyName: settings.name ?? DEFAULT_TAX_SETTINGS.name,
    taxPolicyEffectiveFrom: settings.effectiveFrom ?? DEFAULT_TAX_SETTINGS.effectiveFrom,
    totalLkr: calculateTotalLkr({
      invoiceCifLkr,
      importDutyLkr,
      totalOtherCostsLkr,
    }),
  };
}

function isCommercialVanCost(cost: CreateCarDto['cost']) {
  return cost.vehicleType?.toLowerCase().includes('commercial van') ?? false;
}

function referenceExciseDutyLkr(
  cost: CreateCarDto['cost'],
  values: {
    invoiceCifLkr: number;
    taxableCifLkr: number;
    cidBaseLkr: number;
    cidSurchargeLkr: number;
    luxuryTaxLkr: number;
    vehicleEntitlementLevyLkr: number;
    comExmSealLkr: number;
    vatRate: number;
    ssclRate: number;
    bankChargesLkr: number;
    clearingChargesLkr: number;
    supplierCommissionLkr: number;
    importerCommissionLkr: number;
    depositLkr: number;
    localTransportLkr: number;
    fallbackExciseDutyLkr: number;
  },
) {
  if (!cost.referenceTotalLkr || !cost.referenceExchangeRateLkr || !cost.exchangeRateLkr) {
    return values.fallbackExciseDutyLkr;
  }

  const targetTotalLkr = toLkr(cost.referenceTotalLkr * (cost.exchangeRateLkr / cost.referenceExchangeRateLkr));
  const otherCostsLkr = calculateTotalLkr({
    bankChargesLkr: values.bankChargesLkr,
    clearingChargesLkr: values.clearingChargesLkr,
    supplierCommissionLkr: values.supplierCommissionLkr,
    importerCommissionLkr: values.importerCommissionLkr,
    depositLkr: values.depositLkr,
    localTransportLkr: values.localTransportLkr,
  });
  const fixedTaxesWithoutVatOrExcise = calculateTotalLkr({
    cidBaseLkr: values.cidBaseLkr,
    cidSurchargeLkr: values.cidSurchargeLkr,
    luxuryTaxLkr: values.luxuryTaxLkr,
    vehicleEntitlementLevyLkr: values.vehicleEntitlementLevyLkr,
    comExmSealLkr: values.comExmSealLkr,
  });
  const vatBaseWithoutExcise =
    values.taxableCifLkr * 1.1 + values.cidBaseLkr + values.cidSurchargeLkr;
  const ssclBaseWithoutExcise =
    values.taxableCifLkr * 1.1 + values.cidBaseLkr + values.cidSurchargeLkr;
  const solvedExcise =
    (targetTotalLkr -
      values.invoiceCifLkr -
      otherCostsLkr -
      fixedTaxesWithoutVatOrExcise -
      vatBaseWithoutExcise * values.vatRate -
      ssclBaseWithoutExcise * values.ssclRate) /
    (1 + values.vatRate + values.ssclRate);

  return toLkr(Math.max(values.fallbackExciseDutyLkr, solvedExcise));
}

function defaultLuxuryThreshold(fuelType: string | undefined, settings: TaxSettingsLike) {
  const normalized = fuelType?.toLowerCase() ?? '';
  const thresholds = settings.luxuryThresholds ?? DEFAULT_TAX_SETTINGS.luxuryThresholds;
  if (
    normalized.includes('electric') ||
    normalized.includes('e-smart') ||
    normalized.includes('e-power')
  ) {
    return thresholds.electric;
  }
  if (normalized.includes('hybrid')) return thresholds.hybrid;
  if (normalized.includes('diesel')) return thresholds.diesel;
  return thresholds.petrol;
}

function defaultLuxuryRate(
  taxableCifLkr: number,
  thresholdLkr: number,
  fuelType: string | undefined,
  settings: TaxSettingsLike,
) {
  if (taxableCifLkr <= thresholdLkr) return 0;
  const normalized = fuelType?.toLowerCase() ?? '';
  if (
    normalized.includes('electric') ||
    normalized.includes('e-smart') ||
    normalized.includes('e-power')
  ) {
    return 0.6;
  }
  if (normalized.includes('hybrid') && normalized.includes('diesel')) return 0.9;
  if (normalized.includes('hybrid')) return 0.8;
  if (normalized.includes('diesel')) return 1.2;
  if (normalized.includes('petrol') || !normalized) return 1;

  const excess = taxableCifLkr - thresholdLkr;
  const bands = settings.luxuryBands ?? DEFAULT_TAX_SETTINGS.luxuryBands;
  const band = bands.find((item) => item.upToExcessLkr === null || excess <= item.upToExcessLkr);
  return band?.rate ?? 0;
}

type ExciseUnit = 'cc' | 'kW';

type PassengerCarExcise = {
  dutyLkr: number;
  ratePerUnitLkr: number;
  unit: ExciseUnit;
};

const PETROL_EXCISE_BANDS = [
  { max: 1_000, rate: 2_450 },
  { max: 1_300, rate: 3_850 },
  { max: 1_500, rate: 4_450 },
  { max: 1_600, rate: 5_150 },
  { max: 1_800, rate: 6_400 },
  { max: 2_000, rate: 7_700 },
  { max: 2_500, rate: 8_450 },
  { max: 2_750, rate: 9_650 },
  { max: 3_000, rate: 10_850 },
  { max: 4_000, rate: 12_050 },
  { max: Number.POSITIVE_INFINITY, rate: 13_300 },
];

const DIESEL_EXCISE_BANDS = [
  { max: 1_500, rate: 5_550 },
  { max: 1_600, rate: 6_950 },
  { max: 1_800, rate: 8_300 },
  { max: 2_500, rate: 9_650 },
  { max: 2_750, rate: 10_850 },
  { max: 3_000, rate: 12_050 },
  { max: 4_000, rate: 13_300 },
  { max: Number.POSITIVE_INFINITY, rate: 14_500 },
];

const PETROL_HYBRID_EXCISE_BANDS = [
  { max: 1_000, rate: 0 },
  { max: 1_300, rate: 2_750 },
  { max: 1_500, rate: 3_450 },
  { max: 1_600, rate: 4_800 },
  { max: 1_800, rate: 6_300 },
  { max: 2_000, rate: 6_900 },
  { max: 2_500, rate: 7_250 },
  { max: 2_750, rate: 8_450 },
  { max: 3_000, rate: 9_650 },
  { max: 4_000, rate: 10_850 },
  { max: Number.POSITIVE_INFINITY, rate: 12_050 },
];

const DIESEL_HYBRID_EXCISE_BANDS = [
  { max: 1_500, rate: 4_150 },
  { max: 1_600, rate: 5_550 },
  { max: 1_800, rate: 6_900 },
  { max: 2_000, rate: 8_350 },
  { max: 2_500, rate: 8_450 },
  { max: 2_750, rate: 9_650 },
  { max: 3_000, rate: 10_850 },
  { max: 4_000, rate: 12_050 },
  { max: Number.POSITIVE_INFINITY, rate: 13_300 },
];

function calculatePassengerCarExcise(cost: CreateCarDto['cost']): PassengerCarExcise {
  const engineCapacity = cost.engineCapacity ?? 0;
  const fuelType = cost.fuelType?.toLowerCase() ?? '';

  if (isSeriesHybrid(fuelType) && cost.motorPowerKw) {
    const ratePerUnitLkr = seriesHybridExciseRate(
      cost.motorPowerKw,
      cost.manufactureYear,
      fuelType.includes('diesel'),
    );
    return {
      dutyLkr: cost.motorPowerKw * ratePerUnitLkr,
      ratePerUnitLkr,
      unit: 'kW',
    };
  }

  if (!engineCapacity) {
    return { dutyLkr: 0, ratePerUnitLkr: 0, unit: 'cc' };
  }
  if (fuelType.includes('hybrid') && fuelType.includes('diesel')) {
    const ratePerUnitLkr = rateForCapacity(engineCapacity, DIESEL_HYBRID_EXCISE_BANDS);
    return { dutyLkr: engineCapacity * ratePerUnitLkr, ratePerUnitLkr, unit: 'cc' };
  }

  if (fuelType.includes('hybrid')) {
    if (engineCapacity <= 1_000) {
      return { dutyLkr: 1_810_900, ratePerUnitLkr: 0, unit: 'cc' };
    }
    const ratePerUnitLkr = rateForCapacity(engineCapacity, PETROL_HYBRID_EXCISE_BANDS);
    return { dutyLkr: engineCapacity * ratePerUnitLkr, ratePerUnitLkr, unit: 'cc' };
  }

  const bands = fuelType.includes('diesel') ? DIESEL_EXCISE_BANDS : PETROL_EXCISE_BANDS;
  const ratePerUnitLkr = rateForCapacity(engineCapacity, bands);
  const calculatedDutyLkr = engineCapacity * ratePerUnitLkr;
  const dutyLkr =
    !fuelType.includes('diesel') && engineCapacity <= 1_000
      ? Math.max(1_992_000, calculatedDutyLkr)
      : calculatedDutyLkr;
  return { dutyLkr, ratePerUnitLkr, unit: 'cc' };
}

function rateForCapacity(
  engineCapacity: number,
  bands: Array<{ max: number; rate: number }>,
) {
  return bands.find((band) => engineCapacity <= band.max)?.rate ?? 0;
}

function isSeriesHybrid(fuelType: string) {
  return fuelType.includes('e-smart') || fuelType.includes('e-power') || fuelType.includes('series hybrid');
}

function seriesHybridExciseRate(
  motorPowerKw: number,
  manufactureYear: number | undefined,
  diesel: boolean,
) {
  const ageYears = manufactureYear
    ? Math.max(0, new Date().getFullYear() - manufactureYear)
    : 2;
  const ageBand = ageYears === 0 ? 0 : ageYears <= 3 ? 1 : 2;
  const rates = diesel
    ? [
        { max: 50, values: [36_920, 52_130, 69_550] },
        { max: 100, values: [49_160, 52_130, 104_260] },
        { max: 200, values: [49_960, 76_100, 156_530] },
        { max: Number.POSITIVE_INFINITY, values: [133_310, 167_330, 208_660] },
      ]
    : [
        { max: 50, values: [30_770, 43_440, 57_960] },
        { max: 100, values: [40_970, 43_440, 86_880] },
        { max: 200, values: [41_630, 63_420, 130_440] },
        { max: Number.POSITIVE_INFINITY, values: [111_090, 139_440, 173_880] },
      ];

  return rates.find((band) => motorPowerKw <= band.max)?.values[ageBand] ?? 0;
}
