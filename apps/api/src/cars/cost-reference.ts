import { CreateCarDto } from './dto';

type CarLike = {
  title?: string;
  maker?: string;
  model?: string;
  modelCode?: string;
  vehicleGrade?: string;
  chassisCode?: string;
  // Auction condition grade is intentionally excluded from vehicle-variant matching.
  auctionGrade?: string;
  features?: string[];
  cost: CreateCarDto['cost'];
};

type CostInput = CreateCarDto['cost'];

type WorkbookReference = {
  model: RegExp;
  code?: RegExp;
  grade: RegExp;
  cifJpy: number;
  invoiceCifJpy?: number;
  label: string;
  totalLkr: number;
  fuelType?: string;
  motorPowerKw?: number;
  freightJpy?: number;
  insuranceJpy?: number;
  yellowBookValueJpy?: number;
  yellowBookFreightJpy?: number;
  depreciationRate?: number;
  cidSurchargeRate?: number;
  vehicleEntitlementLevyLkr?: number;
  preferReferenceCharges?: boolean;
};

const WORKBOOK_SOURCE = 'docs/ALL MODEL TAX WEB AND YELLOY BBOK NEW NEW NEW.xlsx';
const EVERY_WORKBOOK_SOURCE = 'docs/Every (2).xlsx';
const RAIZE_WORKBOOK_SOURCE = 'docs/Raize (2).xlsx';
const LEGACY_ROOMY_TAX_SOURCE = 'docs/roomy_tax.pdf page 2';
const MIN_TRUSTED_AUCTION_PRICE_JPY = 300_000;
const MIN_REFERENCE_PRICE_RATIO = 0.8;

const references: WorkbookReference[] = [
  { model: /yaris|vitz/i, code: /KSP210/i, grade: /\bG\b/i, cifJpy: 1_558_000, label: '5BA-KSP210 YARIS G' , totalLkr: 5_425_000 },
  { model: /yaris|vitz/i, code: /KSP210/i, grade: /\bX\b/i, cifJpy: 1_385_000, label: '5BA-KSP210 YARIS X' , totalLkr: 5_160_000 },

  { model: /raize/i, code: /A210A/i, grade: /\bZ\b/i, cifJpy: 1_963_900, invoiceCifJpy: 2_249_000, label: '5BA-A210A RAIZE Z 4WD' , totalLkr: 10_948_388 },
  { model: /raize/i, code: /A210A/i, grade: /\bG\b/i, cifJpy: 1_826_200, invoiceCifJpy: 2_149_000, label: '5BA-A210A RAIZE G 4WD' , totalLkr: 11_407_859 },
  { model: /raize/i, code: /A210A/i, grade: /\bX\b/i, cifJpy: 1_705_500, invoiceCifJpy: 2_120_000, label: '5BA-A210A RAIZE X 4WD' , totalLkr: 10_422_946 },
  { model: /raize/i, code: /A201A/i, grade: /\bZ\b/i, cifJpy: 1_763_950, invoiceCifJpy: 2_295_000, label: '5BA-A201A RAIZE Z 2WD' , totalLkr: 14_281_430 },
  { model: /raize/i, code: /A201A/i, grade: /\bG\b/i, cifJpy: 1_613_500, invoiceCifJpy: 2_195_000, label: '5BA-A201A RAIZE G 2WD' , totalLkr: 13_138_731 },
  { model: /raize/i, code: /A201A/i, grade: /\bX\b/i, cifJpy: 1_491_950, invoiceCifJpy: 1_560_000, label: '5BA-A201A RAIZE X 2WD' , totalLkr: 11_306_350 },
  { model: /raize/i, code: /A202A/i, grade: /\bZ\b/i, cifJpy: 1_987_500, invoiceCifJpy: 1_995_000, label: '5AA-A202A RAIZE HYBRID Z' , totalLkr: 11_282_998, fuelType: 'e-SMART Hybrid', motorPowerKw: 78 },
  { model: /raize/i, code: /A202A/i, grade: /\bG\b/i, cifJpy: 1_849_800, invoiceCifJpy: 2_570_000, label: '5AA-A202A RAIZE HYBRID G' , totalLkr: 12_941_339, fuelType: 'e-SMART Hybrid', motorPowerKw: 78 },

  { model: /wagon r/i, code: /MH85S/i, grade: /\bFX\b/i, cifJpy: 1_075_000, label: '5AA-MH85S WAGON R FX' , totalLkr: 4_125_000 },
  { model: /wagon r/i, code: /MH95S/i, grade: /FX-S/i, cifJpy: 1_200_000, label: '5AA-MH95S WAGON R HYBRID FX-S' , totalLkr: 4_325_000 },
  { model: /wagon r/i, grade: /\bZL\b/i, cifJpy: 1_200_000, label: 'WAGON R ZL' , totalLkr: 4_325_000 },
  { model: /wagon r/i, code: /MH95S/i, grade: /ZX/i, cifJpy: 1_415_000, label: '5AA-MH95S WAGON R CUSTOM Z HYBRID ZX' , totalLkr: 4_665_000 },
  { model: /wagon r/i, code: /MH55S/i, grade: /ZT|STINGRAY|T\b/i, cifJpy: 1_415_000, label: '4AA-MH55S WAGON R CUSTOM/STINGRAY' , totalLkr: 4_665_000 },

  { model: /vezel/i, code: /RV5/i, grade: /\bRS\b/i, cifJpy: 3_022_000, label: '6AA-RV5 HONDA VEZEL RS' , totalLkr: 11_570_000 },
  { model: /vezel/i, code: /RV5/i, grade: /PLAY/i, cifJpy: 2_984_000, label: '6AA-RV5 HONDA VEZEL Z PLAY' , totalLkr: 11_460_000 },
  { model: /vezel/i, code: /RV5/i, grade: /\bZ\b/i, cifJpy: 2_652_000, label: '6AA-RV5 HONDA VEZEL Z' , totalLkr: 10_425_000 },
  { model: /vezel/i, code: /RV5/i, grade: /HUNT/i, cifJpy: 2_528_000, label: '6AA-RV5 HONDA VEZEL X HUNT' , totalLkr: 10_240_000 },
  { model: /vezel/i, code: /RV5/i, grade: /\bX\b/i, cifJpy: 2_442_000, label: '6AA-RV5 HONDA VEZEL X' , totalLkr: 10_100_000 },

  { model: /n[\s-]?box/i, code: /JF5/i, grade: /JOY TURBO/i, cifJpy: 1_650_150, label: '6BA-JF5 HONDA N-BOX JOY TURBO' , totalLkr: 4_310_000 },
  { model: /n[\s-]?box/i, code: /JF5/i, grade: /CUSTOM.*TURBO|TURBO.*CUSTOM/i, cifJpy: 1_713_900, label: '6BA-JF5 HONDA N-BOX CUSTOM TURBO' , totalLkr: 4_390_000 },
  { model: /n[\s-]?box/i, code: /JF5/i, grade: /CUSTOM/i, cifJpy: 1_562_000, label: '6BA-JF5 HONDA N-BOX CUSTOM' , totalLkr: 4_275_000 },
  { model: /n[\s-]?box/i, code: /JF5/i, grade: /TURBO/i, cifJpy: 1_713_900, label: '6BA-JF5 HONDA N-BOX TURBO' , totalLkr: 4_390_000 },
  { model: /n[\s-]?box/i, code: /JF5/i, grade: /.*/i, cifJpy: 1_375_600, label: '6BA-JF5 HONDA N-BOX' , totalLkr: 4_000_000 },

  { model: /taft/i, code: /LA900S/i, grade: /G.*TURBO.*DARK/i, cifJpy: 1_433_000, label: '5BA-LA900S TAFT G-TURBO DARK CHROME' , totalLkr: 4_690_000 },
  { model: /taft/i, code: /LA900S/i, grade: /G.*TURBO/i, cifJpy: 1_430_000, label: '5BA-LA900S TAFT G-TURBO' , totalLkr: 4_690_000 },
  { model: /taft/i, code: /LA900S/i, grade: /G.*DARK|G.*CHROME/i, cifJpy: 1_369_000, label: '5BA-LA900S TAFT G CHROME' , totalLkr: 4_590_000 },
  { model: /taft/i, code: /LA900S/i, grade: /\bG\b/i, cifJpy: 1_314_000, label: '5BA-LA900S TAFT G' , totalLkr: 4_510_000 },
  { model: /taft/i, code: /LA900S/i, grade: /X.*TURBO/i, cifJpy: 1_242_000, label: '5BA-LA900S TAFT X-TURBO' , totalLkr: 4_390_000 },
  { model: /taft/i, code: /LA900S/i, grade: /\bX\b/i, cifJpy: 1_169_000, label: '5BA-LA900S TAFT X' , totalLkr: 4_280_000 },

  { model: /mira/i, code: /LA350S/i, grade: /\bG\b/i, cifJpy: 1_090_000, label: '5BA-LA350S MIRA ES G' , totalLkr: 4_150_000 },
  { model: /mira/i, code: /LA350S/i, grade: /\bX\b/i, cifJpy: 982_000, label: '5BA-LA350S MIRA ES X' , totalLkr: 3_980_000 },
  { model: /mira/i, code: /LA350S/i, grade: /\bL\b/i, cifJpy: 863_000, label: '5BA-LA350S MIRA ES L' , totalLkr: 3_790_000 },
  { model: /mira/i, code: /LA350S/i, grade: /\bB\b/i, cifJpy: 833_000, label: '5BA-LA350S MIRA ES B' , totalLkr: 3_750_000 },

  { model: /voxy/i, code: /ZWR90W/i, grade: /S-?Z|SZ/i, cifJpy: 3_280_000, label: '6AA-ZWR90W VOXY HYBRID SZ' , totalLkr: 19_300_000 },
  { model: /voxy/i, code: /ZWR90W/i, grade: /S-?G|SG/i, cifJpy: 2_970_000, label: '6AA-ZWR90W VOXY HYBRID SG' , totalLkr: 18_425_000 },
  { model: /vellfire|alphard/i, code: /AAHH40W/i, grade: /EXECUTIVE/i, cifJpy: 6_836_000, label: '6AA-AAHH40W ALPHARD EXECUTIVE LOUNGE' , totalLkr: 36_700_000 },
  { model: /vellfire|alphard/i, code: /AAHH40W/i, grade: /\bZ\b|Z PREMIUM/i, cifJpy: 5_097_000, label: '6AA-AAHH40W ALPHARD/VELLFIRE Z' , totalLkr: 31_700_000 },
  { model: /vellfire|alphard/i, code: /AAHH40W/i, grade: /\bX\b/i, cifJpy: 4_131_000, label: '6AA-AAHH40W ALPHARD X' , totalLkr: 28_900_000 },
];

export function applyWorkbookReferenceCost(car: CarLike): CostInput {
  const taxProfile = inferTaxProfile(car);
  const exactReference = findWorkbookReference(car);
  const bandReference = car.cost.websiteValueJpy
    ? undefined
    : engineBandReference(car, taxProfile.fuelType);
  const reference =
    exactReference?.preferReferenceCharges
      ? exactReference
      : exactReference && bandReference
      ? exactReference.cifJpy >= bandReference.cifJpy
        ? exactReference
        : bandReference
      : exactReference ?? bandReference;
  const baseCost = withoutPreviousReference(car.cost);
  const profiledCost = {
    ...baseCost,
    freightJpy: reference?.preferReferenceCharges ? (reference.freightJpy ?? baseCost.freightJpy) : baseCost.freightJpy,
    insuranceJpy: reference?.preferReferenceCharges ? (reference.insuranceJpy ?? baseCost.insuranceJpy) : baseCost.insuranceJpy,
    yellowBookValueJpy: reference?.yellowBookValueJpy ?? baseCost.yellowBookValueJpy,
    yellowBookFreightJpy: reference?.yellowBookFreightJpy ?? baseCost.yellowBookFreightJpy,
    depreciationRate: reference?.depreciationRate ?? baseCost.depreciationRate,
    cidSurchargeRate: reference?.cidSurchargeRate ?? baseCost.cidSurchargeRate,
    vehicleEntitlementLevyLkr: reference?.vehicleEntitlementLevyLkr ?? baseCost.vehicleEntitlementLevyLkr,
    fuelType: reference?.fuelType ?? taxProfile.fuelType ?? baseCost.fuelType,
    motorPowerKw: reference?.motorPowerKw ?? taxProfile.motorPowerKw ?? baseCost.motorPowerKw,
  };
  if (!reference) return profiledCost;

  const freightJpy = profiledCost.freightJpy ?? 220_000;
  const insuranceJpy = profiledCost.insuranceJpy ?? 50_000;
  const referenceInvoiceCifJpy = reference.preferReferenceCharges
    ? reference.invoiceCifJpy ?? reference.cifJpy
    : Math.max(reference.invoiceCifJpy ?? reference.cifJpy, bandReference?.invoiceCifJpy ?? bandReference?.cifJpy ?? 0);
  const fallbackAuctionPriceJpy = Math.max(0, referenceInvoiceCifJpy - freightJpy - insuranceJpy);
  const minimumTrustedAuctionPriceJpy = Math.max(
    MIN_TRUSTED_AUCTION_PRICE_JPY,
    fallbackAuctionPriceJpy * MIN_REFERENCE_PRICE_RATIO,
  );
  const alreadyUsedFallback = car.cost.calculationBasis === 'Workbook reference CIF fallback';
  const needsFallback =
    alreadyUsedFallback ||
    !profiledCost.auctionPriceJpy ||
    profiledCost.auctionPriceJpy < minimumTrustedAuctionPriceJpy;
  const benchmark = workbookBenchmark(car, profiledCost.fuelType, reference);

  return {
    ...profiledCost,
    auctionPriceJpy: needsFallback ? fallbackAuctionPriceJpy : profiledCost.auctionPriceJpy,
    invoiceCifJpy: needsFallback ? referenceInvoiceCifJpy : profiledCost.invoiceCifJpy,
    exciseDutyLkr: undefined,
    vatLkr: undefined,
    ssclLkr: undefined,
    importDutyLkr: undefined,
    referenceCifJpy: reference.cifJpy,
    referenceTotalLkr: benchmark.totalLkr,
    referenceExchangeRateLkr: benchmark.exchangeRateLkr,
    referenceModel: reference.label,
    referenceSource: benchmark.source,
    calculationBasis: needsFallback ? 'Workbook reference CIF fallback' : 'Auction price with workbook reference',
  };
}

function engineBandReference(car: CarLike, inferredFuelType?: string): WorkbookReference | undefined {
  const engineCapacity = car.cost.engineCapacity ?? 0;
  const fuelType = inferredFuelType ?? car.cost.fuelType ?? '';

  if (engineCapacity <= 0) return undefined;
  if (engineCapacity <= 660) {
    return {
      model: /.*/,
      grade: /.*/,
      cifJpy: 1_248_000,
      invoiceCifJpy: 1_095_000,
      label: 'Every PC 660cc workbook benchmark',
      totalLkr: 6_906_894,
    };
  }
  if (engineCapacity > 0 && engineCapacity <= 1_000) {
    return {
      model: /.*/,
      grade: /.*/,
      cifJpy: 1_826_200,
      invoiceCifJpy: 2_149_000,
      label: 'Raize A210A-G 1000cc 4WD workbook benchmark',
      totalLkr: 11_407_859,
    };
  }
  if (engineCapacity > 0 && engineCapacity <= 1_500) {
    const hybrid = fuelType.toLowerCase().includes('hybrid');
    return {
      model: /.*/,
      grade: /.*/,
      cifJpy: hybrid ? 1_849_800 : 1_491_950,
      invoiceCifJpy: hybrid ? 1_995_000 : 1_560_000,
      label: hybrid
        ? 'Raize A202A-G hybrid workbook benchmark'
        : 'Raize A201A-X petrol workbook benchmark',
      totalLkr: hybrid ? 12_941_339 : 11_306_350,
    };
  }
  return undefined;
}

function workbookBenchmark(car: CarLike, fuelType: string | undefined, reference: WorkbookReference) {
  const engineCapacity = car.cost.engineCapacity ?? 0;
  const identity = `${car.title ?? ''} ${car.model ?? ''} ${car.vehicleGrade ?? ''}`;

  if (/RAIZE/i.test(reference.label)) {
    const exchangeRateLkr = /A210A/i.test(reference.label)
      ? 2.125
      : /A202A.*\bZ\b/i.test(reference.label)
        ? 2
        : 2.08;
    return {
      source: RAIZE_WORKBOOK_SOURCE,
      totalLkr: reference.totalLkr,
      exchangeRateLkr,
    };
  }
  if (engineCapacity > 0 && engineCapacity <= 660) {
    const turboOrPremium = /turbo|custom|zx|zt|join/i.test(identity);
    return {
      source: EVERY_WORKBOOK_SOURCE,
      totalLkr: turboOrPremium ? 7_636_110 : 6_906_894,
      exchangeRateLkr: 2,
    };
  }
  if (engineCapacity > 0 && engineCapacity <= 1_000) {
    return {
      source: RAIZE_WORKBOOK_SOURCE,
      totalLkr: 11_407_859,
      exchangeRateLkr: 2.125,
    };
  }
  if (engineCapacity > 0 && engineCapacity <= 1_500) {
    const hybrid = fuelType?.toLowerCase().includes('hybrid') ?? false;
    return {
      source: RAIZE_WORKBOOK_SOURCE,
      totalLkr: hybrid ? 11_282_998 : 11_306_350,
      exchangeRateLkr: hybrid ? 2 : 2.08,
    };
  }
  return {
    source: WORKBOOK_SOURCE,
    totalLkr: reference.totalLkr,
    exchangeRateLkr: 1.97,
  };
}

function findWorkbookReference(car: CarLike) {
  const model = `${car.maker ?? ''} ${car.model ?? ''} ${car.title ?? ''}`;
  const code = `${car.modelCode ?? ''} ${car.chassisCode ?? ''}`;
  const grade = `${car.vehicleGrade ?? ''} ${car.title ?? ''} ${(car.features ?? []).join(' ')}`;

  return references.find((reference) => {
    if (!reference.model.test(model)) return false;
    if (reference.code && !reference.code.test(code)) return false;
    return reference.grade.test(grade);
  });
}

function inferTaxProfile(car: CarLike) {
  const identity = [
    car.title,
    car.maker,
    car.model,
    car.modelCode,
    car.chassisCode,
    car.vehicleGrade,
    ...(car.features ?? []),
  ]
    .filter(Boolean)
    .join(' ');

  if (/A202A|A202S|e[- ]?smart/i.test(identity)) {
    return { fuelType: 'e-SMART Hybrid', motorPowerKw: 78 };
  }
  if (/e[- ]?power/i.test(identity)) {
    return { fuelType: 'e-POWER Hybrid' };
  }
  if (/e:?HEV|(?:^|[\s:_-])HEV(?:$|[\s:_-])|G[_-]?HEV|A202S|hybrid|prius|aqua|insight/i.test(identity)) {
    return { fuelType: 'Hybrid' };
  }
  if (/diesel/i.test(identity)) {
    return { fuelType: 'Diesel' };
  }
  return {};
}

function withoutPreviousReference(cost: CostInput): CostInput {
  const {
    referenceCifJpy: _referenceCifJpy,
    referenceCifLkr: _referenceCifLkr,
    referenceTotalLkr: _referenceTotalLkr,
    referenceExchangeRateLkr: _referenceExchangeRateLkr,
    referenceModel: _referenceModel,
    referenceSource: _referenceSource,
    calculationBasis: _calculationBasis,
    ...baseCost
  } = cost;

  if (cost.referenceSource !== LEGACY_ROOMY_TAX_SOURCE) return baseCost;
  const {
    yellowBookValueJpy: _yellowBookValueJpy,
    yellowBookFreightJpy: _yellowBookFreightJpy,
    depreciationRate: _depreciationRate,
    cidSurchargeRate: _cidSurchargeRate,
    vehicleEntitlementLevyLkr: _vehicleEntitlementLevyLkr,
    ...withoutLegacyRoomy
  } = baseCost;
  return withoutLegacyRoomy;
}
