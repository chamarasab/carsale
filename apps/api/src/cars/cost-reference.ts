import { CreateCarDto } from './dto';

type CarLike = {
  title?: string;
  maker?: string;
  model?: string;
  modelCode?: string;
  chassisCode?: string;
  auctionGrade?: string;
  features?: string[];
  cost: CreateCarDto['cost'];
};

type CostInput = CreateCarDto['cost'];

const WORKBOOK_SOURCE = 'docs/ALL MODEL TAX WEB AND YELLOY BBOK NEW NEW NEW.xlsx';
const MIN_TRUSTED_AUCTION_PRICE_JPY = 300_000;

const references = [
  { model: /yaris|vitz/i, code: /KSP210/i, grade: /\bG\b/i, cifJpy: 1_558_000, label: '5BA-KSP210 YARIS G' , totalLkr: 5_425_000 },
  { model: /yaris|vitz/i, code: /KSP210/i, grade: /\bX\b/i, cifJpy: 1_385_000, label: '5BA-KSP210 YARIS X' , totalLkr: 5_160_000 },

  { model: /raize/i, code: /A210A/i, grade: /\bZ\b/i, cifJpy: 1_950_000, label: '5BA-A210A RAIZE Z 4WD' , totalLkr: 6_050_000 },
  { model: /raize/i, code: /A210A/i, grade: /\bG\b/i, cifJpy: 1_812_000, label: '5BA-A210A RAIZE G 4WD' , totalLkr: 5_825_000 },
  { model: /raize/i, code: /A210A/i, grade: /\bX\b/i, cifJpy: 1_691_000, label: '5BA-A210A RAIZE X 4WD' , totalLkr: 5_640_000 },
  { model: /raize/i, code: /A201A/i, grade: /\bZ\b/i, cifJpy: 1_773_000, label: '5BA-A201A RAIZE Z 2WD' , totalLkr: 8_380_000 },
  { model: /raize/i, code: /A201A/i, grade: /\bG\b/i, cifJpy: 1_623_000, label: '5BA-A201A RAIZE G 2WD' , totalLkr: 8_135_000 },
  { model: /raize/i, code: /A201A/i, grade: /\bX\b/i, cifJpy: 1_500_000, label: '5BA-A201A RAIZE X 2WD' , totalLkr: 7_950_000 },
  { model: /raize/i, code: /A202A/i, grade: /\bZ\b/i, cifJpy: 1_992_000, label: '5AA-A202A RAIZE HYBRID Z' , totalLkr: 7_025_000 },
  { model: /raize/i, code: /A202A/i, grade: /\bG\b/i, cifJpy: 1_854_000, label: '5AA-A202A RAIZE HYBRID G' , totalLkr: 6_810_000 },

  { model: /roomy|thor/i, code: /M900/i, grade: /CUSTOM GT|G-T/i, cifJpy: 1_830_000, label: '4BA-M900A ROOMY CUSTOM GT/G-T' , totalLkr: 5_860_000 },
  { model: /roomy|thor/i, code: /M900/i, grade: /CUSTOM G/i, cifJpy: 1_717_000, label: '5BA-M900A ROOMY CUSTOM G' , totalLkr: 5_685_000 },
  { model: /roomy|thor/i, code: /M900/i, grade: /\bG\b/i, cifJpy: 1_579_000, label: '5BA-M900A ROOMY G' , totalLkr: 5_460_000 },
  { model: /roomy|thor/i, code: /M900/i, grade: /\bX\b/i, cifJpy: 1_427_000, label: '5BA-M900A ROOMY X' , totalLkr: 5_225_000 },

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
  const reference = findWorkbookReference(car);
  if (!reference) return car.cost;

  const freightJpy = car.cost.freightJpy ?? 220_000;
  const insuranceJpy = car.cost.insuranceJpy ?? 50_000;
  const fallbackAuctionPriceJpy = Math.max(0, reference.cifJpy - freightJpy - insuranceJpy);
  const alreadyUsedFallback = car.cost.calculationBasis === 'Workbook reference CIF fallback';
  const needsFallback = alreadyUsedFallback || !car.cost.auctionPriceJpy || car.cost.auctionPriceJpy < MIN_TRUSTED_AUCTION_PRICE_JPY;

  return {
    ...car.cost,
    auctionPriceJpy: needsFallback ? fallbackAuctionPriceJpy : car.cost.auctionPriceJpy,
    invoiceCifJpy: needsFallback ? reference.cifJpy : car.cost.invoiceCifJpy,
    exciseDutyLkr: undefined,
    vatLkr: undefined,
    ssclLkr: undefined,
    importDutyLkr: undefined,
    referenceCifJpy: reference.cifJpy,
    referenceTotalLkr: reference.totalLkr,
    referenceExchangeRateLkr: 1.97,
    referenceModel: reference.label,
    referenceSource: WORKBOOK_SOURCE,
    calculationBasis: needsFallback ? 'Workbook reference CIF fallback' : 'Auction price with workbook reference',
  };
}

function findWorkbookReference(car: CarLike) {
  const model = `${car.maker ?? ''} ${car.model ?? ''} ${car.title ?? ''}`;
  const code = `${car.modelCode ?? ''} ${car.chassisCode ?? ''}`;
  const grade = `${car.auctionGrade ?? ''} ${car.title ?? ''} ${(car.features ?? []).join(' ')}`;

  return references.find((reference) => {
    if (!reference.model.test(model)) return false;
    if (reference.code && !reference.code.test(code)) return false;
    return reference.grade.test(grade);
  });
}
