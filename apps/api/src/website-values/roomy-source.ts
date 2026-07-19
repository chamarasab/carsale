export const TOYOTA_ROOMY_GRADE_URL = 'https://toyota.jp/roomy/grade/';
export const TOYOTA_ROOMY_DATA_URL =
  'https://toyota.jp/pages/contents/include/carpage_format/carlineup/data/json/grades8.json';

export type SeedWebsiteValue = {
  no: number;
  key: string;
  maker: string;
  model: string;
  vehicleModel: string;
  vehicleGrade: string;
  aliases: string[];
  drivetrain: '2WD' | '4WD';
  modelCodes: string[];
  price: number;
  currency: 'JPY';
  taxIncluded: boolean;
  consumptionTaxRate: number;
  customsDepreciationRate: number;
  sourceUrl: string;
  sourceDataUrl: string;
  effectiveFrom: string;
  active: boolean;
};

export const TOYOTA_ROOMY_WEBSITE_VALUES: SeedWebsiteValue[] = [
  roomyValue(
    1,
    'M900A-GBVJ',
    'Custom G-T',
    ['Custom G-T', 'Custom GT', 'Custom G Turbo'],
    '2WD',
    2_257_200,
  ),
  roomyValue(2, 'M900A-GBVE', 'Custom G', ['Custom G'], '2WD', 2_118_600),
  roomyValue(3, 'M910A-GBVE', 'Custom G', ['Custom G'], '4WD', 2_294_600),
  roomyValue(
    4,
    'M900A-GBGJ',
    'G-T',
    ['G-T', 'GT', 'G Turbo'],
    '2WD',
    2_065_800,
  ),
  roomyValue(5, 'M900A-GBGE', 'G', ['G'], '2WD', 1_939_300),
  roomyValue(6, 'M910A-GBGE', 'G', ['G'], '4WD', 2_115_300),
  roomyValue(7, 'M900A-GBME', 'X', ['X'], '2WD', 1_742_400),
  roomyValue(8, 'M910A-GBME', 'X', ['X'], '4WD', 1_918_400),
];

function roomyValue(
  no: number,
  modelCode: string,
  vehicleGrade: string,
  aliases: string[],
  drivetrain: '2WD' | '4WD',
  price: number,
): SeedWebsiteValue {
  return {
    no,
    key: `toyota-roomy-${modelCode.toLowerCase()}`,
    maker: 'Toyota',
    model: 'Roomy',
    vehicleModel: `Toyota Roomy ${vehicleGrade} ${drivetrain}`,
    vehicleGrade,
    aliases,
    drivetrain,
    modelCodes: [modelCode],
    price,
    currency: 'JPY',
    taxIncluded: true,
    consumptionTaxRate: 0.1,
    customsDepreciationRate: 0.85,
    sourceUrl: TOYOTA_ROOMY_GRADE_URL,
    sourceDataUrl: TOYOTA_ROOMY_DATA_URL,
    effectiveFrom: '2024-12-01',
    active: true,
  };
}
