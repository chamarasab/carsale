import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAIHATSU_MIRA_WEBSITE_VALUES,
  DAIHATSU_ROCKY_WEBSITE_VALUES,
  KNOWN_WEBSITE_VALUES,
  SUZUKI_SPACIA_WEBSITE_VALUES,
  SUZUKI_WAGON_R_WEBSITE_VALUES,
  TOYOTA_YARIS_WEBSITE_VALUES,
} from './manufacturer-sources';
import { TOYOTA_ROOMY_WEBSITE_VALUES } from './roomy-source';
import { selectWebsiteValueForCar } from './website-value-matcher';

const records = TOYOTA_ROOMY_WEBSITE_VALUES.map((value) => ({
  ...value,
  _id: value.key,
}));

test('matches Roomy Custom G 2WD by grade and M900A chassis prefix', () => {
  const match = selectWebsiteValueForCar(records, {
    title: '2025 Toyota Roomy Custom G',
    maker: 'Toyota',
    model: 'Roomy',
    modelCode: 'M900A',
    chassisCode: 'IAT M900A',
    features: ['Grade Custom G'],
  });

  assert.equal(match?.vehicleModel, 'Toyota Roomy Custom G 2WD');
  assert.equal(match?.price, 2_118_600);
});

test('uses the 4WD manufacturer value for an M910A Roomy', () => {
  const match = selectWebsiteValueForCar(records, {
    title: '2025 Toyota Roomy Custom G 4WD',
    maker: 'Toyota',
    model: 'Roomy',
    modelCode: 'M910A',
    features: ['Grade Custom G 4WD'],
  });

  assert.equal(match?.vehicleModel, 'Toyota Roomy Custom G 4WD');
  assert.equal(match?.price, 2_294_600);
});

test('prefers Custom G-T over the less-specific Custom G and G aliases', () => {
  const match = selectWebsiteValueForCar(records, {
    title: '2025 Toyota Roomy Custom G-T',
    maker: 'Toyota',
    model: 'Roomy',
    modelCode: 'M900A',
  });

  assert.equal(match?.vehicleGrade, 'Custom G-T');
  assert.equal(match?.price, 2_257_200);
});

test('does not match an unknown Roomy trim or a Daihatsu Thor', () => {
  const unknownTrim = selectWebsiteValueForCar(records, {
    title: '2025 Toyota Roomy TSS',
    maker: 'Toyota',
    model: 'Roomy',
    modelCode: 'M900A',
  });
  const thor = selectWebsiteValueForCar(records, {
    title: '2025 Daihatsu Thor Custom G',
    maker: 'Daihatsu',
    model: 'Thor',
    modelCode: 'M900S',
  });

  assert.equal(unknownTrim, undefined);
  assert.equal(thor, undefined);
});

test('keeps the curated manufacturer catalog identifiers unique', () => {
  assert.equal(KNOWN_WEBSITE_VALUES.length, 75);
  assert.equal(new Set(KNOWN_WEBSITE_VALUES.map((value) => value.no)).size, 75);
  assert.equal(new Set(KNOWN_WEBSITE_VALUES.map((value) => value.key)).size, 75);
  assert.ok(KNOWN_WEBSITE_VALUES.every((value) => value.price > 0 && value.sourceUrl.startsWith('https://')));
});

test('matches the exact current Yaris model code and drivetrain', () => {
  const match = selectWebsiteValueForCar(TOYOTA_YARIS_WEBSITE_VALUES, {
    title: '2026 Toyota Yaris Hybrid Z',
    maker: 'Toyota',
    model: 'Yaris',
    modelCode: '6AA-MXPH17-AHXEB',
  });

  assert.equal(match?.vehicleModel, 'Toyota Yaris Z Hybrid 1.5L E-Four 4WD');
  assert.equal(match?.price, 2_884_200);
});

test('maps the previous Yaris hybrid chassis code to the current official grade', () => {
  const match = selectWebsiteValueForCar(TOYOTA_YARIS_WEBSITE_VALUES, {
    title: '2025 Toyota Yaris Hybrid G',
    maker: 'Toyota',
    model: 'Yaris',
    modelCode: '6AA-MXPH10-AHXGB',
  });

  assert.equal(match?.vehicleGrade, 'G');
  assert.equal(match?.drivetrain, '2WD');
  assert.equal(match?.price, 2_445_300);
});

test('does not guess a Wagon R drivetrain when the auction code is incomplete', () => {
  const ambiguous = selectWebsiteValueForCar(SUZUKI_WAGON_R_WEBSITE_VALUES, {
    title: '2026 Suzuki Wagon R Hybrid ZX',
    maker: 'Suzuki',
    model: 'Wagon R',
    modelCode: 'MH95S',
  });
  const fourWheelDrive = selectWebsiteValueForCar(SUZUKI_WAGON_R_WEBSITE_VALUES, {
    title: '2026 Suzuki Wagon R Hybrid ZX',
    maker: 'Suzuki',
    model: 'Wagon R',
    modelCode: 'MH95S-WZXP-A5',
  });

  assert.equal(ambiguous, undefined);
  assert.equal(fourWheelDrive?.drivetrain, '4WD');
  assert.equal(fourWheelDrive?.price, 1_829_300);
});

test('matches Rocky HEV before the shorter Premium G alias', () => {
  const match = selectWebsiteValueForCar(DAIHATSU_ROCKY_WEBSITE_VALUES, {
    title: '2026 Daihatsu Rocky Premium G HEV',
    maker: 'Daihatsu',
    model: 'Rocky',
    modelCode: '5AA-A202S-GBSH',
  });

  assert.equal(match?.vehicleGrade, 'Premium G HEV');
  assert.equal(match?.price, 2_460_700);
});

test('treats Mira and Mira e:S as the same auction model', () => {
  const match = selectWebsiteValueForCar(DAIHATSU_MIRA_WEBSITE_VALUES, {
    title: '2026 Daihatsu Mira e:S G SA III',
    maker: 'Daihatsu',
    model: 'Mira e:S',
    modelCode: '5BA-LA360S-GBPF',
  });

  assert.equal(match?.vehicleModel, 'Daihatsu Mira G SA III 4WD');
  assert.equal(match?.price, 1_446_500);
});

test('treats Spacia Custom as a trim of the Spacia auction model', () => {
  const match = selectWebsiteValueForCar(SUZUKI_SPACIA_WEBSITE_VALUES, {
    title: '2026 Suzuki Spacia Custom Hybrid XS Turbo',
    maker: 'Suzuki',
    model: 'Spacia Custom',
    modelCode: '4AA-MK54S-ZTXB',
  });

  assert.equal(match?.vehicleModel, 'Suzuki Spacia Custom Hybrid XS Turbo 2WD');
  assert.equal(match?.price, 2_073_500);
});
