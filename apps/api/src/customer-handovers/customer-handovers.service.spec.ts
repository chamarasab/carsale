import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { CustomerHandoversService } from './customer-handovers.service';

const imageUrl = 'https://example.com/images/gridfs/507f1f77bcf86cd799439011/handover.webp';

test('lists handovers with the newest uploads first', async () => {
  let sort: Record<string, number> | undefined;
  const expected = [{ _id: new Types.ObjectId(), imageUrl }];
  const service = new CustomerHandoversService(
    {
      find: () => ({
        sort: (value: Record<string, number>) => {
          sort = value;
          return { lean: async () => expected };
        },
      }),
    } as never,
    { saveImages: async () => [] } as never,
    { deleteImages: async () => 0 } as never,
  );

  const handovers = await service.findAll();

  assert.equal(handovers.length, 42);
  assert.deepEqual(handovers[0], { ...expected[0], origin: 'uploaded' });
  assert.equal(handovers[1]._id, 'bundled-1');
  assert.equal(handovers.at(-1)?._id, 'bundled-41');
  assert.deepEqual(sort, { createdAt: -1, _id: -1 });
});

test('keeps a deleted bundled handover hidden from the unified gallery', async () => {
  const service = new CustomerHandoversService(
    {
      find: () => ({
        sort: () => ({
          lean: async () => [{ imageUrl: '/customer-handovers/handover-01.webp', hidden: true, sourceKey: 'bundled-1' }],
        }),
      }),
    } as never,
    { saveImages: async () => [] } as never,
    { deleteImages: async () => 0 } as never,
  );

  const handovers = await service.findAll();

  assert.equal(handovers.length, 40);
  assert.equal(handovers.some((handover) => handover._id === 'bundled-1'), false);
});

test('stores a handover after its optimized image is uploaded', async () => {
  let saved: Record<string, unknown> | undefined;
  const service = new CustomerHandoversService(
    {
      create: async (value: Record<string, unknown>) => {
        saved = value;
        return value;
      },
    } as never,
    { saveImages: async () => [imageUrl] } as never,
    { deleteImages: async () => 0 } as never,
  );

  await service.create({ originalname: 'handover.jpg' } as Express.Multer.File);

  assert.deepEqual(saved, { imageUrl, origin: 'uploaded' });
});

test('removes an uploaded image when the handover record cannot be stored', async () => {
  const deleted: string[][] = [];
  const service = new CustomerHandoversService(
    { create: async () => Promise.reject(new Error('database unavailable')) } as never,
    { saveImages: async () => [imageUrl] } as never,
    {
      deleteImages: async (urls: string[]) => {
        deleted.push(urls);
        return urls.length;
      },
    } as never,
  );

  await assert.rejects(
    () => service.create({ originalname: 'handover.jpg' } as Express.Multer.File),
    /database unavailable/,
  );
  assert.deepEqual(deleted, [[imageUrl]]);
});

test('deleting a handover removes its GridFS image', async () => {
  const id = new Types.ObjectId().toHexString();
  const deleted: string[][] = [];
  const service = new CustomerHandoversService(
    {
      findByIdAndDelete: () => ({
        lean: async () => ({ _id: id, imageUrl }),
      }),
    } as never,
    { saveImages: async () => [] } as never,
    {
      deleteImages: async (urls: string[]) => {
        deleted.push(urls);
        return urls.length;
      },
    } as never,
  );

  assert.deepEqual(await service.remove(id), { deleted: true });
  assert.deepEqual(deleted, [[imageUrl]]);
});

test('deleting a bundled handover stores a persistent gallery suppression', async () => {
  let update:
    | {
        filter: Record<string, unknown>;
        options: Record<string, unknown>;
        update: Record<string, unknown>;
      }
    | undefined;
  const service = new CustomerHandoversService(
    {
      updateOne: async (
        filter: Record<string, unknown>,
        value: Record<string, unknown>,
        options: Record<string, unknown>,
      ) => {
        update = { filter, options, update: value };
      },
    } as never,
    { saveImages: async () => [] } as never,
    {
      deleteImages: async () => {
        throw new Error('Bundled assets must not be removed from GridFS');
      },
    } as never,
  );

  assert.deepEqual(await service.remove('bundled-1'), { deleted: true });
  assert.deepEqual(update?.filter, { sourceKey: 'bundled-1' });
  assert.deepEqual(update?.options, { upsert: true });
  assert.deepEqual(update?.update, {
    $set: {
      hidden: true,
      imageUrl: '/customer-handovers/handover-01.webp',
      origin: 'bundled',
      sourceKey: 'bundled-1',
    },
  });
});
