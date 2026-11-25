import assert from 'node:assert/strict';
import test from 'node:test';
import { UsersService } from './users.service';

test('creates a configured Google administrator as active', async () => {
  let created: Record<string, unknown> | undefined;
  const service = createService({
    findOne: async () => null,
    create: async (input: Record<string, unknown>) => {
      created = input;
      return input;
    },
  });

  await service.findOrCreateGoogleUser({
    googleSubject: 'google-subject',
    email: 'AselaWhatsApp@gmail.com',
    name: 'Asela',
  });

  assert.equal(created?.email, 'aselawhatsapp@gmail.com');
  assert.equal(created?.role, 'ADMIN');
  assert.equal(created?.active, true);
});

test('promotes and activates an existing configured Google administrator', async () => {
  const existing = {
    email: 'aselawhatsapp@gmail.com',
    name: 'Asela',
    role: 'USER',
    active: false,
    async save() {
      return this;
    },
  };
  const service = createService({ findOne: async () => existing });

  const result = await service.findOrCreateGoogleUser({
    googleSubject: 'google-subject',
    email: 'aselawhatsapp@gmail.com',
    name: 'Asela',
  });

  assert.equal(result.user.role, 'ADMIN');
  assert.equal(result.user.active, true);
  assert.equal(result.user.googleSubject, 'google-subject');
});

test('skips saving an existing Google administrator when nothing changed', async () => {
  let saves = 0;
  const existing = {
    email: 'aselawhatsapp@gmail.com',
    name: 'Asela',
    role: 'ADMIN',
    active: true,
    googleSubject: 'google-subject',
    async save() {
      saves += 1;
      return this;
    },
  };
  const service = createService({ findOne: async () => existing });

  const result = await service.findOrCreateGoogleUser({
    googleSubject: 'google-subject',
    email: 'aselawhatsapp@gmail.com',
    name: 'Asela',
  });

  assert.equal(saves, 0);
  assert.equal(result.created, false);
  assert.equal(result.user.role, 'ADMIN');
});

test('skips startup writes when configured admins are already active and survives quota blocks', async () => {
  let updates = 0;
  const service = createService({
    exists: async () => null,
    updateMany: async () => {
      updates += 1;
    },
    findOne: () => ({ lean: async () => ({ _id: 'admin-1', role: 'ADMIN' }) }),
  });

  await service.onModuleInit();
  assert.equal(updates, 0);

  const quotaService = createService({
    exists: async () => ({ _id: 'user-1' }),
    updateMany: async () => {
      const err = new Error('you are over your space quota, using 515 MB of 512 MB. Writes are blocked');
      (err as Error & { code?: number; codeName?: string }).code = 8000;
      (err as Error & { codeName?: string }).codeName = 'AtlasError';
      throw err;
    },
    findOne: () => ({ lean: async () => ({ _id: 'admin-1', role: 'ADMIN' }) }),
  });

  await quotaService.onModuleInit();
});

function createService(modelOverrides: Record<string, unknown>) {
  const model = {
    collection: { indexes: async () => [] },
    ...modelOverrides,
  };
  const config = {
    get(key: string, fallback = '') {
      return key === 'ADMIN_EMAILS' ? 'owner@example.com,aselawhatsapp@gmail.com' : fallback;
    },
  };
  return new UsersService(model as never, config as never);
}
