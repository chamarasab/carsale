import { NotFoundException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';
import { CarsService } from './cars.service';

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
