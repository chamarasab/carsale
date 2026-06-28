import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateImportCost } from './tax-calculator';

function baseCost(overrides: Record<string, unknown> = {}) {
  return {
    auctionPriceJpy: 1_800_000,
    exchangeRateLkr: 2.125,
    freightJpy: 320_000,
    insuranceJpy: 0,
    vehicleType: 'Car',
    fuelType: 'Petrol',
    engineCapacity: 996,
    manufactureYear: new Date().getFullYear() - 2,
    bankChargesLkr: 0,
    clearingChargesLkr: 0,
    importerCommissionLkr: 0,
    localTransportLkr: 0,
    ...overrides,
  };
}

test('uses the workbook petrol excise rate for a 996cc Raize', () => {
  const result = calculateImportCost(baseCost());

  assert.equal(result.exciseRatePerUnitLkr, 2_450);
  assert.equal(result.exciseUnit, 'cc');
  assert.equal(result.exciseDutyLkr, 2_440_200);
});

test('applies the fixed petrol excise duty to a 658cc kei car', () => {
  const result = calculateImportCost(baseCost({ engineCapacity: 658 }));

  assert.equal(result.exciseRatePerUnitLkr, 2_450);
  assert.equal(result.exciseDutyLkr, 1_992_000);
  assert.ok(result.totalLkr >= 6_500_000);
});

test('applies the fixed hybrid excise duty to a 660cc Wagon R', () => {
  const result = calculateImportCost(
    baseCost({
      auctionPriceJpy: 1_100_000,
      engineCapacity: 660,
      fuelType: 'Hybrid Petrol',
    }),
  );

  assert.equal(result.exciseRatePerUnitLkr, 0);
  assert.equal(result.exciseDutyLkr, 1_810_900);
  assert.ok(result.totalLkr >= 6_500_000);
  assert.ok(result.totalLkr <= 9_500_000);
});

test('uses the statutory petrol excise rate for a 1,190cc Raize', () => {
  const result = calculateImportCost(baseCost({ engineCapacity: 1_190 }));

  assert.equal(result.exciseRatePerUnitLkr, 3_850);
  assert.equal(result.exciseUnit, 'cc');
  assert.equal(result.exciseDutyLkr, 4_581_500);
});

test('uses the current-year kW rate for a 78kW Raize e-SMART hybrid', () => {
  const result = calculateImportCost(
    baseCost({
      fuelType: 'e-SMART Hybrid',
      engineCapacity: 1_196,
      motorPowerKw: 78,
      manufactureYear: new Date().getFullYear(),
    }),
  );

  assert.equal(result.exciseRatePerUnitLkr, 40_970);
  assert.equal(result.exciseUnit, 'kW');
  assert.equal(result.exciseDutyLkr, 3_195_660);
});

test('uses the one-to-three-year kW rate for a 2025 Raize e-SMART hybrid', () => {
  const result = calculateImportCost(
    baseCost({
      fuelType: 'e-SMART Hybrid',
      engineCapacity: 1_196,
      motorPowerKw: 78,
      manufactureYear: new Date().getFullYear() - 1,
    }),
  );

  assert.equal(result.exciseRatePerUnitLkr, 43_440);
  assert.equal(result.exciseDutyLkr, 3_388_320);
});

test('uses the expanded CIF base for VAT and SSCL', () => {
  const result = calculateImportCost(baseCost({ engineCapacity: 1_190 }));
  const taxableBase =
    result.taxableCifLkr! * 1.1 +
    result.cidBaseLkr! +
    result.cidSurchargeLkr! +
    result.exciseDutyLkr!;

  assert.equal(result.vatLkr, Math.round(taxableBase * 0.18));
  assert.equal(result.ssclLkr, Math.round(taxableBase * 0.025));
});

test('charges invoice CIF in the customer total while taxing the higher Yellow Book CIF', () => {
  const result = calculateImportCost(
    baseCost({
      auctionPriceJpy: 900_000,
      yellowBookValueJpy: 2_200_000,
      engineCapacity: 1_190,
    }),
  );

  assert.ok(result.taxableCifLkr! > result.invoiceCifLkr!);
  assert.equal(
    result.totalLkr,
    result.invoiceCifLkr! + result.importDutyLkr + result.totalOtherCostsLkr!,
  );
});

test('applies propulsion-specific luxury tax rates above the CIF threshold', () => {
  const petrol = calculateImportCost(
    baseCost({ auctionPriceJpy: 2_500_000, engineCapacity: 1_190 }),
  );
  const hybrid = calculateImportCost(
    baseCost({
      auctionPriceJpy: 2_750_000,
      fuelType: 'Hybrid',
      engineCapacity: 1_196,
    }),
  );

  assert.equal(petrol.luxuryRate, 1);
  assert.equal(
    petrol.luxuryTaxLkr,
    Math.round(Math.max(0, petrol.taxableCifLkr! - 5_000_000)),
  );
  assert.equal(hybrid.luxuryRate, 0.8);
  assert.equal(
    hybrid.luxuryTaxLkr,
    Math.round(Math.max(0, hybrid.taxableCifLkr! - 5_500_000) * 0.8),
  );
});
