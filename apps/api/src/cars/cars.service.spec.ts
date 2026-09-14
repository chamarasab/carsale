import { NotFoundException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';
import { CarsService } from './cars.service';
import { Car } from './car.schema';
import { CreateCarDto } from './dto';
import { WebsiteValuesService } from '../website-values/website-values.service';

function createService() {
  let capturedFilter: Record<string, unknown> | undefined;
  const query = {
    select: () => query,
    slice: () => query,
    sort: () => query,
    lean: async () => [],
  };
  const model = {
    find: (filter: Record<string, unknown>) => {
      capturedFilter = filter;
      return query;
    },
  };
  const service = new CarsService(
    model as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, capturedFilter: () => capturedFilter };
}

test('escapes regular-expression characters in exact maker and model filters', async () => {
  const { service, capturedFilter } = createService();

  await service.findAll({ maker: 'Maker[1]', model: 'Model(Plus)' });

  const filter = capturedFilter();
  assert.ok(filter?.maker instanceof RegExp);
  assert.ok(filter?.model instanceof RegExp);
  assert.equal(filter.maker.test('Maker[1]'), true);
  assert.equal(filter.maker.test('Maker1'), false);
  assert.equal(filter.model.test('Model(Plus)'), true);
});

test('returns a controlled not-found error for malformed public car ids', async () => {
  const { service } = createService();

  await assert.rejects(() => service.findOne('not-an-object-id'), NotFoundException);
  assert.equal(await service.isPublished('not-an-object-id'), false);
});

test('imports and recalculates an auction car without a manufacturer value while preserving its JPY average', async () => {
  let stored: Car & { _id: string };
  let missingReferences = 0;
  const websiteValues = new WebsiteValuesService(
    { find: () => ({ lean: async () => [] }) } as never,
    {
      findOne: () => ({ select: () => ({ lean: async () => null }) }),
      updateOne: async () => { missingReferences += 1; },
    } as never,
  );
  const service = new CarsService(
    {
      findOne: () => ({ lean: async () => null }),
      create: async (car: Car) => { stored = { ...car, _id: '507f1f77bcf86cd799439011' }; return stored; },
      find: () => ({ lean: async () => [stored] }),
      findByIdAndUpdate: async (_id: string, update: Partial<Car>) => { stored = { ...stored, ...update }; return stored; },
    } as never,
    {
      getTaxSettings: async () => ({}),
      getJpyToLkrRate: async () => ({ rate: 2.1, date: '2026-09-14', source: 'test', provider: 'test' }),
    } as never,
    { get: () => undefined } as never,
    {} as never,
    websiteValues,
  );
  const dto: CreateCarDto = {
    title: '2025 Toyota Roomy 2WD', maker: 'Toyota', model: 'Roomy', modelCode: 'M900A', vehicleGrade: '2WD',
    year: 2025, mileageKm: 8000, fuelType: 'Petrol', transmission: 'IAT', auctionGrade: 'R',
    chassisCode: 'M900A', location: 'USS Tokyo', source: 'A-Automarket',
    sourceUrl: 'https://auctions.a-automarket.com/auctions/?p=project/lot&id=123',
    images: ['https://example.com/car.jpg'], features: [], status: 'available', published: true,
    cost: { auctionPriceJpy: 125000, exchangeRateLkr: 2, engineCapacity: 996, fuelType: 'Petrol' },
  };

  const result = await service.upsertBySourceUrl(dto);
  assert.equal(result.created, true);
  assert.ok(result.car);
  assert.equal(result.car.cost.auctionPriceJpy, 125000);
  assert.equal(result.car.cost.websiteValueJpy, undefined);
  assert.equal(result.car.published, true);
  await service.recalculateAll();
  assert.equal(stored!.cost.auctionPriceJpy, 125000);
  assert.equal(missingReferences, 2);
});
