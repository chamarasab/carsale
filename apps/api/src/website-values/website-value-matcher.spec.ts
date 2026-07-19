import assert from 'node:assert/strict';
import test from 'node:test';
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
