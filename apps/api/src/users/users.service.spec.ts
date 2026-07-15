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
