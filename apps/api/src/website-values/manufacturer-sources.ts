import * as cheerio from 'cheerio';
import {
  SeedWebsiteValue,
  TOYOTA_ROOMY_DATA_URL,
  TOYOTA_ROOMY_WEBSITE_VALUES,
} from './roomy-source';

export const TOYOTA_YARIS_GRADE_URL = 'https://toyota.jp/yaris/grade/';
export const TOYOTA_YARIS_DATA_URL =
  'https://toyota.jp/pages/contents/include/carpage_format/carlineup/data/json/grades53.json';
export const SUZUKI_WAGON_R_GRADE_URL =
  'https://www.suzuki.co.jp/car/wagonr/detail/';
export const SUZUKI_SPACIA_GRADE_URL =
  'https://www.suzuki.co.jp/car/spacia/detail/';
export const DAIHATSU_TANTO_GRADE_URL =
  'https://www.daihatsu.co.jp/lineup/tanto/02_grade.htm';
export const DAIHATSU_ROCKY_GRADE_URL =
  'https://www.daihatsu.co.jp/lineup/rocky/02_grade.htm';
export const DAIHATSU_MIRA_GRADE_URL =
  'https://www.daihatsu.co.jp/lineup/mira_e-s/02_grade.htm';
export const DAIHATSU_THOR_GRADE_URL =
  'https://www.daihatsu.co.jp/lineup/thor/02_grade.htm';

const VERIFIED_FROM = '2026-07-20';

type Drivetrain = SeedWebsiteValue['drivetrain'];
type SourcePriceMap = Map<string, number>;

export type ManufacturerPriceSource = {
  id: string;
  label: string;
  url: string;
  records: SeedWebsiteValue[];
  extract: (body: string) => SourcePriceMap;
};

type ToyotaGrade = {
  modelCode?: string;
  priceNumber?: number;
};

function websiteValue(
  no: number,
  key: string,
  maker: string,
  model: string,
  vehicleModel: string,
  vehicleGrade: string,
  aliases: string[],
  drivetrain: Drivetrain,
  modelCodes: string[],
  price: number,
  sourceUrl: string,
  sourceDataUrl = sourceUrl,
): SeedWebsiteValue {
  return {
    no,
    key,
    maker,
    model,
    vehicleModel,
    vehicleGrade,
    aliases,
    drivetrain,
    modelCodes,
    price,
    currency: 'JPY',
    taxIncluded: true,
    consumptionTaxRate: 0.1,
    customsDepreciationRate: 0.85,
    sourceUrl,
    sourceDataUrl,
    effectiveFrom: VERIFIED_FROM,
    active: true,
  };
}

const yarisRows: Array<[number, string, string, string, Drivetrain, number]> = [
  [9, 'MXPH14-AHXEB', 'Z', 'Hybrid 1.5L', '2WD', 2_669_700],
  [10, 'MXPH17-AHXEB', 'Z', 'Hybrid 1.5L E-Four', '4WD', 2_884_200],
  [11, 'MXPA10-AHXEB', 'Z', 'Petrol 1.5L CVT', '2WD', 2_301_200],
  [12, 'MXPA15-AHXEB', 'Z', 'Petrol 1.5L CVT', '4WD', 2_515_700],
  [13, 'MXPA10-AHFEB', 'Z', 'Petrol 1.5L 6MT', '2WD', 2_197_800],
  [14, 'MXPH14-AHXGB', 'G', 'Hybrid 1.5L', '2WD', 2_445_300],
  [15, 'MXPH17-AHXGB', 'G', 'Hybrid 1.5L E-Four', '4WD', 2_669_700],
  [16, 'MXPA10-AHXGB', 'G', 'Petrol 1.5L CVT', '2WD', 2_072_400],
  [17, 'MXPA15-AHXGB', 'G', 'Petrol 1.5L CVT', '4WD', 2_286_900],
  [18, 'MXPA10-AHFGB', 'G', 'Petrol 1.5L 6MT', '2WD', 1_996_500],
  [19, 'KSP210-AHXGK', 'G', 'Petrol 1.0L CVT', '2WD', 1_921_700],
  [20, 'MXPH14-AHXNB', 'X', 'Hybrid 1.5L', '2WD', 2_249_500],
  [21, 'MXPH17-AHXNB', 'X', 'Hybrid 1.5L E-Four', '4WD', 2_473_900],
  [22, 'MXPA10-AHXNB', 'X', 'Petrol 1.5L CVT', '2WD', 1_848_000],
  [23, 'MXPA15-AHXNB', 'X', 'Petrol 1.5L CVT', '4WD', 2_061_400],
  [24, 'MXPA10-AHFNB', 'X', 'Petrol 1.5L 6MT', '2WD', 1_771_000],
  [25, 'KSP210-AHXNK', 'X', 'Petrol 1.0L CVT', '2WD', 1_697_300],
];

export const TOYOTA_YARIS_WEBSITE_VALUES = yarisRows.map(
  ([no, modelCode, grade, variant, drivetrain, price]) =>
    websiteValue(
      no,
      `toyota-yaris-${modelCode.toLowerCase()}`,
      'Toyota',
      'Yaris',
      `Toyota Yaris ${grade} ${variant} ${drivetrain}`,
      grade,
      [grade],
      drivetrain,
      yarisModelCodes(modelCode),
      price,
      TOYOTA_YARIS_GRADE_URL,
      TOYOTA_YARIS_DATA_URL,
    ),
);

function yarisModelCodes(modelCode: string) {
  const previousGenerationCode = modelCode
    .replace(/^MXPH14-/, 'MXPH10-')
    .replace(/^MXPH17-/, 'MXPH15-');
  return previousGenerationCode === modelCode
    ? [modelCode]
    : [modelCode, previousGenerationCode];
}

export const SUZUKI_WAGON_R_WEBSITE_VALUES: SeedWebsiteValue[] = [
  websiteValue(
    26,
    'suzuki-wagon-r-hybrid-zx-2wd',
    'Suzuki',
    'Wagon R',
    'Suzuki Wagon R Hybrid ZX 2WD',
    'Hybrid ZX',
    ['Hybrid ZX', 'ZX'],
    '2WD',
    ['MH95S-WZXB-A5', 'WZXB-A5', 'WZXB-ZM5'],
    1_709_400,
    SUZUKI_WAGON_R_GRADE_URL,
  ),
  websiteValue(
    27,
    'suzuki-wagon-r-hybrid-zx-4wd',
    'Suzuki',
    'Wagon R',
    'Suzuki Wagon R Hybrid ZX 4WD',
    'Hybrid ZX',
    ['Hybrid ZX', 'ZX'],
    '4WD',
    ['MH95S-WZXP-A5', 'WZXP-A5', 'WZXP-ZM5'],
    1_829_300,
    SUZUKI_WAGON_R_GRADE_URL,
  ),
  websiteValue(
    28,
    'suzuki-wagon-r-zl-2wd',
    'Suzuki',
    'Wagon R',
    'Suzuki Wagon R ZL 2WD',
    'ZL',
    ['ZL'],
    '2WD',
    ['MH85S-WZLD-A5', 'MH85S-WZLE-A5', 'WZLD-A5', 'WZLE-A5'],
    1_430_000,
    SUZUKI_WAGON_R_GRADE_URL,
  ),
  websiteValue(
    29,
    'suzuki-wagon-r-zl-4wd',
    'Suzuki',
    'Wagon R',
    'Suzuki Wagon R ZL 4WD',
    'ZL',
    ['ZL'],
    '4WD',
    ['MH85S-WZLJ-A5', 'MH85S-WZLQ-A5', 'WZLJ-A5', 'WZLQ-A5'],
    1_553_200,
    SUZUKI_WAGON_R_GRADE_URL,
  ),
];

export const SUZUKI_SPACIA_WEBSITE_VALUES: SeedWebsiteValue[] = [
  websiteValue(
    30,
    'suzuki-spacia-custom-hybrid-gs-2wd',
    'Suzuki',
    'Spacia',
    'Suzuki Spacia Custom Hybrid GS 2WD',
    'Custom Hybrid GS',
    ['Custom Hybrid GS', 'Hybrid GS', 'Custom GS'],
    '2WD',
    ['MK94S-ZSGB', 'ZSGB'],
    1_801_800,
    SUZUKI_SPACIA_GRADE_URL,
  ),
  websiteValue(
    31,
    'suzuki-spacia-custom-hybrid-gs-4wd',
    'Suzuki',
    'Spacia',
    'Suzuki Spacia Custom Hybrid GS 4WD',
    'Custom Hybrid GS',
    ['Custom Hybrid GS', 'Hybrid GS', 'Custom GS'],
    '4WD',
    ['MK94S-ZSGP', 'ZSGP'],
    1_925_000,
    SUZUKI_SPACIA_GRADE_URL,
  ),
  websiteValue(
    32,
    'suzuki-spacia-custom-hybrid-xs-2wd',
    'Suzuki',
    'Spacia',
    'Suzuki Spacia Custom Hybrid XS 2WD',
    'Custom Hybrid XS',
    ['Custom Hybrid XS', 'Hybrid XS', 'Custom XS'],
    '2WD',
    ['MK94S-ZSXB', 'ZSXB'],
    1_995_400,
    SUZUKI_SPACIA_GRADE_URL,
  ),
  websiteValue(
    33,
    'suzuki-spacia-custom-hybrid-xs-4wd',
    'Suzuki',
    'Spacia',
    'Suzuki Spacia Custom Hybrid XS 4WD',
    'Custom Hybrid XS',
    ['Custom Hybrid XS', 'Hybrid XS', 'Custom XS'],
    '4WD',
    ['MK94S-ZSXP', 'ZSXP'],
    2_115_300,
    SUZUKI_SPACIA_GRADE_URL,
  ),
  websiteValue(
    34,
    'suzuki-spacia-custom-hybrid-xs-turbo-2wd',
    'Suzuki',
    'Spacia',
    'Suzuki Spacia Custom Hybrid XS Turbo 2WD',
    'Custom Hybrid XS Turbo',
    ['Custom Hybrid XS Turbo', 'Hybrid XS Turbo', 'Custom XS Turbo'],
    '2WD',
    ['MK54S-ZTXB', 'ZTXB'],
    2_073_500,
    SUZUKI_SPACIA_GRADE_URL,
  ),
  websiteValue(
    35,
    'suzuki-spacia-custom-hybrid-xs-turbo-4wd',
    'Suzuki',
    'Spacia',
    'Suzuki Spacia Custom Hybrid XS Turbo 4WD',
    'Custom Hybrid XS Turbo',
    ['Custom Hybrid XS Turbo', 'Hybrid XS Turbo', 'Custom XS Turbo'],
    '4WD',
    ['MK54S-ZTXP', 'ZTXP'],
    2_193_400,
    SUZUKI_SPACIA_GRADE_URL,
  ),
];

type DaihatsuRow = [
  number,
  string,
  string,
  string[],
  Drivetrain,
  string[],
  number,
];

function daihatsuValues(model: string, sourceUrl: string, rows: DaihatsuRow[]) {
  return rows.map(([no, key, grade, aliases, drivetrain, modelCodes, price]) =>
    websiteValue(
      no,
      key,
      'Daihatsu',
      model,
      `Daihatsu ${model} ${grade} ${drivetrain}`,
      grade,
      aliases,
      drivetrain,
      modelCodes,
      price,
      sourceUrl,
    ),
  );
}

export const DAIHATSU_TANTO_WEBSITE_VALUES = daihatsuValues(
  'Tanto',
  DAIHATSU_TANTO_GRADE_URL,
  [
    [
      36,
      'daihatsu-tanto-custom-rs-limited-2wd',
      'Custom RS Limited',
      ['Custom RS Limited'],
      '2WD',
      ['LA650S-GBVZ', 'LA650S'],
      1_985_500,
    ],
    [
      37,
      'daihatsu-tanto-custom-rs-limited-4wd',
      'Custom RS Limited',
      ['Custom RS Limited'],
      '4WD',
      ['LA660S-GBVZ', 'LA660S'],
      2_106_500,
    ],
    [
      38,
      'daihatsu-tanto-custom-rs-2wd',
      'Custom RS',
      ['Custom RS'],
      '2WD',
      ['LA650S-GBVZ', 'LA650S'],
      1_963_500,
    ],
    [
      39,
      'daihatsu-tanto-custom-rs-4wd',
      'Custom RS',
      ['Custom RS'],
      '4WD',
      ['LA660S-GBVZ', 'LA660S'],
      2_084_500,
    ],
    [
      40,
      'daihatsu-tanto-custom-x-limited-2wd',
      'Custom X Limited',
      ['Custom X Limited'],
      '2WD',
      ['LA650S-GBVF', 'LA650S'],
      1_892_000,
    ],
    [
      41,
      'daihatsu-tanto-custom-x-limited-4wd',
      'Custom X Limited',
      ['Custom X Limited'],
      '4WD',
      ['LA660S-GBVF', 'LA660S'],
      2_013_000,
    ],
    [
      42,
      'daihatsu-tanto-custom-x-2wd',
      'Custom X',
      ['Custom X'],
      '2WD',
      ['LA650S-GBVF', 'LA650S'],
      1_870_000,
    ],
    [
      43,
      'daihatsu-tanto-custom-x-4wd',
      'Custom X',
      ['Custom X'],
      '4WD',
      ['LA660S-GBVF', 'LA660S'],
      1_991_000,
    ],
    [
      44,
      'daihatsu-tanto-x-turbo-2wd',
      'X Turbo',
      ['X Turbo'],
      '2WD',
      ['LA650S-GBGZ', 'LA650S'],
      1_732_500,
    ],
    [
      45,
      'daihatsu-tanto-x-turbo-4wd',
      'X Turbo',
      ['X Turbo'],
      '4WD',
      ['LA660S-GBGZ', 'LA660S'],
      1_853_500,
    ],
    [
      46,
      'daihatsu-tanto-x-limited-2wd',
      'X Limited',
      ['X Limited'],
      '2WD',
      ['LA650S-GBGF', 'LA650S'],
      1_639_000,
    ],
    [
      47,
      'daihatsu-tanto-x-limited-4wd',
      'X Limited',
      ['X Limited'],
      '4WD',
      ['LA660S-GBGF', 'LA660S'],
      1_760_000,
    ],
    [
      48,
      'daihatsu-tanto-x-2wd',
      'X',
      ['X'],
      '2WD',
      ['LA650S-GBGF', 'LA650S'],
      1_617_000,
    ],
    [
      49,
      'daihatsu-tanto-x-4wd',
      'X',
      ['X'],
      '4WD',
      ['LA660S-GBGF', 'LA660S'],
      1_738_000,
    ],
    [
      50,
      'daihatsu-tanto-l-2wd',
      'L',
      ['L'],
      '2WD',
      ['LA650S-GBDF', 'LA650S'],
      1_485_000,
    ],
    [
      51,
      'daihatsu-tanto-l-4wd',
      'L',
      ['L'],
      '4WD',
      ['LA660S-GBDF', 'LA660S'],
      1_611_500,
    ],
  ],
);

export const DAIHATSU_ROCKY_WEBSITE_VALUES = daihatsuValues(
  'Rocky',
  DAIHATSU_ROCKY_GRADE_URL,
  [
    [
      52,
      'daihatsu-rocky-premium-g-hev-2wd',
      'Premium G HEV',
      ['Premium G HEV'],
      '2WD',
      ['A202S-GBSH', 'A202S'],
      2_460_700,
    ],
    [
      53,
      'daihatsu-rocky-x-hev-2wd',
      'X HEV',
      ['X HEV'],
      '2WD',
      ['A202S-GBXH', 'A202S'],
      2_216_500,
    ],
    [
      54,
      'daihatsu-rocky-premium-g-2wd',
      'Premium G',
      ['Premium G'],
      '2WD',
      ['A201S-GBSF', 'A201S'],
      2_171_400,
    ],
    [
      55,
      'daihatsu-rocky-premium-g-4wd',
      'Premium G',
      ['Premium G'],
      '4WD',
      ['A210S-GBSV', 'A210S'],
      2_432_100,
    ],
    [
      56,
      'daihatsu-rocky-x-2wd',
      'X',
      ['X'],
      '2WD',
      ['A201S-GBXF', 'A201S'],
      1_910_700,
    ],
    [
      57,
      'daihatsu-rocky-x-4wd',
      'X',
      ['X'],
      '4WD',
      ['A210S-GBXV', 'A210S'],
      2_187_900,
    ],
    [
      58,
      'daihatsu-rocky-l-2wd',
      'L',
      ['L'],
      '2WD',
      ['A201S-GBLF', 'A201S'],
      1_761_100,
    ],
    [
      59,
      'daihatsu-rocky-l-4wd',
      'L',
      ['L'],
      '4WD',
      ['A210S-GBLV', 'A210S'],
      2_039_400,
    ],
  ],
);

export const DAIHATSU_MIRA_WEBSITE_VALUES = daihatsuValues(
  'Mira',
  DAIHATSU_MIRA_GRADE_URL,
  [
    [
      60,
      'daihatsu-mira-g-sa3-2wd',
      'G SA III',
      ['G SA III', 'G SA3', 'G Smart Assist III'],
      '2WD',
      ['LA350S-GBPF', 'LA350S'],
      1_320_000,
    ],
    [
      61,
      'daihatsu-mira-g-sa3-4wd',
      'G SA III',
      ['G SA III', 'G SA3', 'G Smart Assist III'],
      '4WD',
      ['LA360S-GBPF', 'LA360S'],
      1_446_500,
    ],
    [
      62,
      'daihatsu-mira-x-sa3-2wd',
      'X SA III',
      ['X SA III', 'X SA3', 'X Smart Assist III'],
      '2WD',
      ['LA350S-GBGF', 'LA350S'],
      1_179_200,
    ],
    [
      63,
      'daihatsu-mira-x-sa3-4wd',
      'X SA III',
      ['X SA III', 'X SA3', 'X Smart Assist III'],
      '4WD',
      ['LA360S-GBGF', 'LA360S'],
      1_305_700,
    ],
    [
      64,
      'daihatsu-mira-l-sa3-2wd',
      'L SA III',
      ['L SA III', 'L SA3', 'L Smart Assist III'],
      '2WD',
      ['LA350S-GBMF', 'LA350S'],
      1_025_200,
    ],
    [
      65,
      'daihatsu-mira-l-sa3-4wd',
      'L SA III',
      ['L SA III', 'L SA3', 'L Smart Assist III'],
      '4WD',
      ['LA360S-GBMF', 'LA360S'],
      1_151_700,
    ],
    [
      66,
      'daihatsu-mira-b-sa3-2wd',
      'B SA III',
      ['B SA III', 'B SA3', 'B Smart Assist III'],
      '2WD',
      ['LA350S-GBRF', 'LA350S'],
      992_200,
    ],
    [
      67,
      'daihatsu-mira-b-sa3-4wd',
      'B SA III',
      ['B SA III', 'B SA3', 'B Smart Assist III'],
      '4WD',
      ['LA360S-GBRF', 'LA360S'],
      1_118_700,
    ],
  ],
);

export const DAIHATSU_THOR_WEBSITE_VALUES = daihatsuValues(
  'Thor',
  DAIHATSU_THOR_GRADE_URL,
  [
    [
      68,
      'daihatsu-thor-g-turbo-2wd',
      'G Turbo',
      ['G Turbo', 'GT'],
      '2WD',
      ['M900S-GBGJ', 'M900S'],
      2_065_800,
    ],
    [
      69,
      'daihatsu-thor-g-2wd',
      'G',
      ['G'],
      '2WD',
      ['M900S-GBGE', 'M900S'],
      1_939_300,
    ],
    [
      70,
      'daihatsu-thor-g-4wd',
      'G',
      ['G'],
      '4WD',
      ['M910S-GBGE', 'M910S'],
      2_115_300,
    ],
    [
      71,
      'daihatsu-thor-x-2wd',
      'X',
      ['X'],
      '2WD',
      ['M900S-GBME', 'M900S'],
      1_742_400,
    ],
    [
      72,
      'daihatsu-thor-x-4wd',
      'X',
      ['X'],
      '4WD',
      ['M910S-GBME', 'M910S'],
      1_918_400,
    ],
    [
      73,
      'daihatsu-thor-custom-g-turbo-2wd',
      'Custom G Turbo',
      ['Custom G Turbo', 'Custom GT'],
      '2WD',
      ['M900S-GBVJ', 'M900S'],
      2_257_200,
    ],
    [
      74,
      'daihatsu-thor-custom-g-2wd',
      'Custom G',
      ['Custom G'],
      '2WD',
      ['M900S-GBVE', 'M900S'],
      2_118_600,
    ],
    [
      75,
      'daihatsu-thor-custom-g-4wd',
      'Custom G',
      ['Custom G'],
      '4WD',
      ['M910S-GBVE', 'M910S'],
      2_294_600,
    ],
  ],
);

export const KNOWN_WEBSITE_VALUES = [
  ...TOYOTA_ROOMY_WEBSITE_VALUES,
  ...TOYOTA_YARIS_WEBSITE_VALUES,
  ...SUZUKI_WAGON_R_WEBSITE_VALUES,
  ...SUZUKI_SPACIA_WEBSITE_VALUES,
  ...DAIHATSU_TANTO_WEBSITE_VALUES,
  ...DAIHATSU_ROCKY_WEBSITE_VALUES,
  ...DAIHATSU_MIRA_WEBSITE_VALUES,
  ...DAIHATSU_THOR_WEBSITE_VALUES,
];

const TANTO_LOOKUPS = [
  ['daihatsu-tanto-custom-rs-limited', '特別仕様車 カスタムRS “Limited”'],
  ['daihatsu-tanto-custom-rs-', 'カスタム RS'],
  ['daihatsu-tanto-custom-x-limited', '特別仕様車 カスタムX “Limited”'],
  ['daihatsu-tanto-custom-x-', 'カスタム X'],
  ['daihatsu-tanto-x-turbo', 'X ターボ'],
  ['daihatsu-tanto-x-limited', '特別仕様車 X “Limited”'],
  ['daihatsu-tanto-x-', 'X'],
  ['daihatsu-tanto-l-', 'L'],
] as const;

const ROCKY_LOOKUPS = [
  ['daihatsu-rocky-premium-g-hev', 'Premium G HEV'],
  ['daihatsu-rocky-x-hev', 'X HEV'],
  ['daihatsu-rocky-premium-g-', 'Premium G'],
  ['daihatsu-rocky-x-', 'X'],
  ['daihatsu-rocky-l-', 'L'],
] as const;

const MIRA_LOOKUPS = [
  ['daihatsu-mira-g-sa3', 'G “SA III”'],
  ['daihatsu-mira-x-sa3', 'X “SA III”'],
  ['daihatsu-mira-l-sa3', 'L “SA III”'],
  ['daihatsu-mira-b-sa3', 'B “SA III”'],
] as const;

const THOR_LOOKUPS = [
  ['daihatsu-thor-g-turbo', 'Gターボ'],
  ['daihatsu-thor-g-', 'G'],
  ['daihatsu-thor-x-', 'X'],
  ['daihatsu-thor-custom-g-turbo', 'カスタムGターボ'],
  ['daihatsu-thor-custom-g-', 'カスタムG'],
] as const;

export const MANUFACTURER_PRICE_SOURCES: ManufacturerPriceSource[] = [
  toyotaSource(
    'toyota-roomy',
    'Toyota Roomy',
    TOYOTA_ROOMY_DATA_URL,
    TOYOTA_ROOMY_WEBSITE_VALUES,
  ),
  toyotaSource(
    'toyota-yaris',
    'Toyota Yaris',
    TOYOTA_YARIS_DATA_URL,
    TOYOTA_YARIS_WEBSITE_VALUES,
  ),
  {
    id: 'suzuki-wagon-r',
    label: 'Suzuki Wagon R',
    url: SUZUKI_WAGON_R_GRADE_URL,
    records: SUZUKI_WAGON_R_WEBSITE_VALUES,
    extract: extractWagonRPrices,
  },
  {
    id: 'suzuki-spacia',
    label: 'Suzuki Spacia Custom',
    url: SUZUKI_SPACIA_GRADE_URL,
    records: SUZUKI_SPACIA_WEBSITE_VALUES,
    extract: extractSpaciaPrices,
  },
  daihatsuSource(
    'daihatsu-tanto',
    'Daihatsu Tanto',
    DAIHATSU_TANTO_GRADE_URL,
    DAIHATSU_TANTO_WEBSITE_VALUES,
    TANTO_LOOKUPS,
  ),
  daihatsuSource(
    'daihatsu-rocky',
    'Daihatsu Rocky',
    DAIHATSU_ROCKY_GRADE_URL,
    DAIHATSU_ROCKY_WEBSITE_VALUES,
    ROCKY_LOOKUPS,
  ),
  daihatsuSource(
    'daihatsu-mira',
    'Daihatsu Mira e:S',
    DAIHATSU_MIRA_GRADE_URL,
    DAIHATSU_MIRA_WEBSITE_VALUES,
    MIRA_LOOKUPS,
  ),
  daihatsuSource(
    'daihatsu-thor',
    'Daihatsu Thor',
    DAIHATSU_THOR_GRADE_URL,
    DAIHATSU_THOR_WEBSITE_VALUES,
    THOR_LOOKUPS,
  ),
];

function toyotaSource(
  id: string,
  label: string,
  url: string,
  records: SeedWebsiteValue[],
): ManufacturerPriceSource {
  return {
    id,
    label,
    url,
    records,
    extract(body) {
      const grades = JSON.parse(body) as ToyotaGrade[];
      const prices = new Map<string, number>();
      for (const record of records) {
        const grade = grades.find((item) =>
          record.modelCodes.some(
            (code) => item.modelCode?.toUpperCase() === code.toUpperCase(),
          ),
        );
        if (grade?.priceNumber && grade.priceNumber > 0) {
          prices.set(record.key, grade.priceNumber);
        }
      }
      return prices;
    },
  };
}

function extractWagonRPrices(body: string) {
  const $ = cheerio.load(body);
  const prices = new Map<string, number>();
  const lookups: Array<[string, string, string]> = [
    [
      'suzuki-wagon-r-hybrid-zx-2wd',
      'hybridzx',
      'data-carousel-price-price2wd',
    ],
    [
      'suzuki-wagon-r-hybrid-zx-4wd',
      'hybridzx',
      'data-carousel-price-price4wd',
    ],
    ['suzuki-wagon-r-zl-2wd', 'zl', 'data-carousel-price-price2wd'],
    ['suzuki-wagon-r-zl-4wd', 'zl', 'data-carousel-price-price4wd'],
  ];
  for (const [key, gradeClass, attribute] of lookups) {
    const candidates = $(`.${gradeClass}[${attribute}]`)
      .toArray()
      .map((element) => parsePrice($(element).attr(attribute)))
      .filter((price): price is number => price !== undefined);
    if (!candidates.length)
      throw new Error(`Official price not found for ${key}`);
    prices.set(key, Math.min(...candidates));
  }
  return prices;
}

function extractSpaciaPrices(body: string) {
  const $ = cheerio.load(body);
  const prices = new Map<string, number>();
  const lookups: Array<[string, string]> = [
    ['suzuki-spacia-custom-hybrid-gs-2wd', 'custom_gs_2wd'],
    ['suzuki-spacia-custom-hybrid-gs-4wd', 'custom_gs_4wd'],
    ['suzuki-spacia-custom-hybrid-xs-2wd', 'custom_xs_2wd'],
    ['suzuki-spacia-custom-hybrid-xs-4wd', 'custom_xs_4wd'],
    ['suzuki-spacia-custom-hybrid-xs-turbo-2wd', 'custom_turbo_xs_2wd'],
    ['suzuki-spacia-custom-hybrid-xs-turbo-4wd', 'custom_turbo_xs_4wd'],
  ];
  for (const [key, dataName] of lookups) {
    const element = $(`[data-name="${dataName}"]`)
      .toArray()
      .find((candidate) => /[\d,]+\s*円/.test($(candidate).text()));
    const price = parsePrice(
      element
        ? $(element)
            .text()
            .match(/[\d,]+(?=\s*円)/)?.[0]
        : undefined,
    );
    if (!price) throw new Error(`Official price not found for ${key}`);
    prices.set(key, price);
  }
  return prices;
}

function daihatsuSource(
  id: string,
  label: string,
  url: string,
  records: SeedWebsiteValue[],
  lookups: ReadonlyArray<readonly [string, string]>,
): ManufacturerPriceSource {
  return {
    id,
    label,
    url,
    records,
    extract(body) {
      const $ = cheerio.load(body);
      const sections = $('.lineup-c-section__basic--tab-main').toArray();

      const prices = new Map<string, number>();
      for (const record of records) {
        const lookup = lookups.find(([keyPrefix]) =>
          record.key.startsWith(keyPrefix),
        );
        if (!lookup)
          throw new Error(`Official grade mapping not found for ${record.key}`);
        const officialGrade = normalizeOfficialLabel(lookup[1]);
        const section = sections.find(
          (candidate) =>
            normalizeOfficialLabel(
              $(candidate).find('h3.lineup-c-heading3').first().text(),
            ) === officialGrade,
        );
        if (!section)
          throw new Error(`Official grade not found for ${record.key}`);
        const item = $(section)
          .find('.lineup-p-grade-lineup__item')
          .toArray()
          .find((candidate) => {
            const variant = $(candidate).find('h4').first().text();
            return (
              !variant.includes('北海道') &&
              inferOfficialDrivetrain(variant) === record.drivetrain
            );
          });
        const price = parsePrice(
          item
            ? $(item).find('.lineup-p-grade-lineup__price-num').first().text()
            : undefined,
        );
        if (!price)
          throw new Error(`Official price not found for ${record.key}`);
        prices.set(record.key, price);
      }
      return prices;
    },
  };
}

function normalizeOfficialLabel(value: string) {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function inferOfficialDrivetrain(value: string): Drivetrain | undefined {
  const normalized = value.normalize('NFKC').toUpperCase();
  if (normalized.includes('4WD')) return '4WD';
  if (normalized.includes('2WD')) return '2WD';
  return undefined;
}

function parsePrice(value?: string) {
  if (!value) return undefined;
  const price = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(price) && price > 0 ? price : undefined;
}
