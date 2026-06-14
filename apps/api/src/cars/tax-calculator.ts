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
  const yellowBookCifLkr = cost.yellowBookValueJpy
    ? toLkr(
        ((cost.yellowBookValueJpy * 100) / 110) *
          (cost.depreciationRate ?? settings.defaultDepreciationRate ?? DEFAULT_TAX_SETTINGS.defaultDepreciationRate) *
          exchangeRateLkr +
          shippingLkr +
          insuranceLkr,
      )
    : invoiceCifLkr;
  const taxableCifLkr = Math.max(invoiceCifLkr, yellowBookCifLkr);
  const taxableCifSource = taxableCifLkr === yellowBookCifLkr ? 'yellow-book' : 'invoice';

  const cidRate = cost.cidRate ?? settings.cidRate ?? DEFAULT_TAX_SETTINGS.cidRate;
  const cidSurchargeRate =
    cost.cidSurchargeRate ?? settings.cidSurchargeRate ?? DEFAULT_TAX_SETTINGS.cidSurchargeRate;
  const vatRate = cost.vatRate ?? settings.vatRate ?? DEFAULT_TAX_SETTINGS.vatRate;
  const ssclRate = cost.ssclRate ?? settings.ssclRate ?? DEFAULT_TAX_SETTINGS.ssclRate;
  const luxuryThresholdLkr = cost.luxuryThresholdLkr ?? defaultLuxuryThreshold(cost.fuelType, settings);
  const luxuryRate = cost.luxuryRate ?? defaultLuxuryRate(taxableCifLkr, luxuryThresholdLkr, settings);

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
  const baseExciseDutyLkr = toLkr((cost.engineCapacity ?? 0) * (cost.exciseRatePerUnitLkr ?? 0));
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
  const exciseDutyLkr = cost.referenceTotalLkr ? solvedReferenceExciseDutyLkr : cost.exciseDutyLkr ?? solvedReferenceExciseDutyLkr;
  const vatLkr = cost.vatLkr ?? toLkr((taxableCifLkr + cidBaseLkr + cidSurchargeLkr + exciseDutyLkr) * vatRate);
  const ssclLkr = cost.ssclLkr ?? toLkr((taxableCifLkr + cidBaseLkr + cidSurchargeLkr + exciseDutyLkr) * ssclRate);
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
      taxableCifLkr,
      importDutyLkr,
      totalOtherCostsLkr,
    }),
  };
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
  const luxuryRate = cost.luxuryRate ?? defaultLuxuryRate(taxableCifLkr, luxuryThresholdLkr, settings);
  const cidBaseLkr = cost.cidBaseLkr ?? toLkr(taxableCifLkr * cidRate);
  const cidSurchargeLkr = cost.cidSurchargeLkr ?? toLkr(cidBaseLkr * cidSurchargeRate);
  const exciseDutyLkr = cost.exciseDutyLkr ?? toLkr((cost.engineCapacity ?? 0) * (cost.exciseRatePerUnitLkr ?? 0));
  const luxuryTaxLkr = cost.luxuryTaxLkr ?? toLkr(Math.max(0, taxableCifLkr - luxuryThresholdLkr) * luxuryRate);
  const vatLkr = cost.vatLkr ?? toLkr((taxableCifLkr * 1.1 + cidBaseLkr + cidSurchargeLkr + exciseDutyLkr) * vatRate);
  const ssclLkr = cost.ssclLkr ?? toLkr((taxableCifLkr * 1.1) * ssclRate);
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
  const vatBaseWithoutExcise = values.taxableCifLkr + values.cidBaseLkr + values.cidSurchargeLkr;
  const ssclBaseWithoutExcise = values.taxableCifLkr + values.cidBaseLkr + values.cidSurchargeLkr;
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
  if (normalized.includes('electric') || normalized.includes('e-smart')) return thresholds.electric;
  if (normalized.includes('hybrid')) return thresholds.hybrid;
  if (normalized.includes('diesel')) return thresholds.diesel;
  return thresholds.petrol;
}

function defaultLuxuryRate(taxableCifLkr: number, thresholdLkr: number, settings: TaxSettingsLike) {
  if (taxableCifLkr <= thresholdLkr) return 0;
  const excess = taxableCifLkr - thresholdLkr;
  const bands = settings.luxuryBands ?? DEFAULT_TAX_SETTINGS.luxuryBands;
  const band = bands.find((item) => item.upToExcessLkr === null || excess <= item.upToExcessLkr);
  return band?.rate ?? 0;
}
