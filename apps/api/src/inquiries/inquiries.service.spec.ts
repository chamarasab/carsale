import { NotFoundException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { InquiriesService } from './inquiries.service';

const inquiry = {
  carId: new Types.ObjectId().toHexString(),
  name: 'Test Buyer',
  email: 'buyer@example.com',
  phone: '+94770000000',
  message: 'Please confirm availability.',
};

test('rejects inquiries for missing or unpublished cars', async () => {
  let createCalled = false;
  const model = {
    create: () => {
      createCalled = true;
    },
  };
  const service = new InquiriesService(
    model as never,
    { isPublished: async () => false } as never,
  );

  await assert.rejects(() => service.create(inquiry), NotFoundException);
  assert.equal(createCalled, false);
});

test('stores an inquiry only after confirming the public car exists', async () => {
  let payload: Record<string, unknown> | undefined;
  const model = {
    create: async (value: Record<string, unknown>) => {
      payload = value;
      return value;
    },
  };
  const service = new InquiriesService(
    model as never,
    { isPublished: async () => true } as never,
  );

  await service.create(inquiry);

  assert.ok(payload?.carId instanceof Types.ObjectId);
  assert.equal(payload?.email, inquiry.email);
});
