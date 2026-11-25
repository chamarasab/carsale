import assert from 'node:assert/strict';
import test from 'node:test';
import { PassThrough } from 'node:stream';
import { mongo } from 'mongoose';
import { MediaService } from './media.service';

type MockCar = {
  _id: mongo.ObjectId;
  source: string;
  auctionDate?: string;
  createdAt?: Date;
  images: string[];
};

type MockFile = {
  _id: mongo.ObjectId;
  length: number;
  uploadDate: Date;
};

function createMediaHarness({
  cars = [],
  files = [],
  handovers = [],
  maxBytes = 500,
  chunkOverhead = 0,
}: {
  cars?: MockCar[];
  files?: MockFile[];
  handovers?: Array<{ imageUrl: string }>;
  maxBytes?: number;
  chunkOverhead?: number;
}) {
  const deletedFileIds: string[] = [];
  const uploadedFiles: Array<{ id: string; size: number }> = [];

  const db = {
    command: async ({ collStats }: { collStats: string }) => {
      assert.equal(collStats, 'images.chunks');
      return { size: files.reduce((sum, file) => sum + file.length + chunkOverhead, 0) };
    },
    collection: (name: string) => {
      if (name === 'cars') {
        return {
          find: (filter: Record<string, unknown> = {}) => ({
            toArray: async () =>
              cars.filter((car) => {
                const sourceFilter = filter.source as { $in?: string[] } | undefined;
                if (sourceFilter?.$in && !sourceFilter.$in.includes(car.source)) return false;
                if ('images.0' in filter && (!car.images || car.images.length === 0)) return false;
                return true;
              }),
          }),
          deleteMany: async (filter: { _id?: { $in?: mongo.ObjectId[] } }) => {
            const targetIds = new Set((filter._id?.$in ?? []).map(String));
            let deletedCount = 0;
            for (let index = cars.length - 1; index >= 0; index -= 1) {
              if (targetIds.has(String(cars[index]._id))) {
                cars.splice(index, 1);
                deletedCount += 1;
              }
            }
            return { deletedCount };
          },
        };
      }
      if (name === 'customerhandovers') {
        return {
          find: () => ({ toArray: async () => handovers }),
        };
      }
      if (name === 'images.chunks') {
        return {};
      }
      if (name === 'images.files') {
        return {
          find: (filter: { uploadDate?: { $lt?: Date } } = {}) => ({
            toArray: async () =>
              files.filter((file) => {
                const cutoff = filter.uploadDate?.$lt;
                return cutoff ? file.uploadDate < cutoff : true;
              }),
          }),
        };
      }
      throw new Error(`Unexpected collection ${name}`);
    },
  };

  const service = new MediaService(
    { db } as never,
    {
      get: (key: string) => (key === 'IMAGE_STORAGE_MAX_BYTES' ? String(maxBytes) : undefined),
    } as never,
  );

  (service as unknown as { bucket: unknown }).bucket = {
    find: ({ _id }: { _id: mongo.ObjectId }) => ({
      next: async () => files.find((file) => String(file._id) === String(_id)) ?? null,
    }),
    delete: async (_id: mongo.ObjectId) => {
      const index = files.findIndex((file) => String(file._id) === String(_id));
      if (index >= 0) {
        files.splice(index, 1);
        deletedFileIds.push(String(_id));
      }
    },
    openUploadStreamWithId: (id: mongo.ObjectId) => {
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const total = Buffer.concat(chunks).length;
        files.push({ _id: id, length: total, uploadDate: new Date() });
        uploadedFiles.push({ id: String(id), size: total });
      });
      // Consume readable pipe immediately.
      queueMicrotask(() => stream.resume());
      return stream;
    },
  };

  return { service, cars, files, deletedFileIds, uploadedFiles };
}

function gridUrl(id: mongo.ObjectId) {
  return `https://api.example.com/images/gridfs/${id.toHexString()}/car.jpg`;
}

test('removes expired scraped cars before adding a new image when over budget', async (t) => {
  const expiredImgId = new mongo.ObjectId();
  const activeImgId = new mongo.ObjectId();
  const expiredCarId = new mongo.ObjectId();
  const activeCarId = new mongo.ObjectId();

  const { service, cars, files, deletedFileIds } = createMediaHarness({
    maxBytes: 500,
    cars: [
      { _id: expiredCarId, source: 'A-Automarket', auctionDate: '2026-11-20', images: [gridUrl(expiredImgId)] },
      { _id: activeCarId, source: 'A-Automarket', auctionDate: '2026-11-30', images: [gridUrl(activeImgId)] },
    ],
    files: [
      { _id: expiredImgId, length: 300, uploadDate: new Date('2026-11-20T00:00:00Z') },
      { _id: activeImgId, length: 250, uploadDate: new Date('2026-11-25T00:00:00Z') },
    ],
  });
  t.mock.method(service['logger'], 'log', () => undefined);

  const savedUrl = await service.saveImage({
    buffer: Buffer.alloc(150),
    contentType: 'image/webp',
    filename: 'new-car.webp',
  });

  assert.ok(savedUrl.includes('/images/gridfs/'));
  assert.deepEqual(deletedFileIds, [String(expiredImgId)]);
  assert.deepEqual(cars.map((car) => String(car._id)), [String(activeCarId)]);
  assert.equal(files.reduce((sum, file) => sum + file.length, 0), 400);
});

test('prunes oldest active scraped cars after expired cars while preserving manual ads and handovers', async (t) => {
  const olderScrapedImg = new mongo.ObjectId();
  const newerScrapedImg = new mongo.ObjectId();
  const manualImg = new mongo.ObjectId();
  const handoverImg = new mongo.ObjectId();

  const olderCarId = new mongo.ObjectId();
  const newerCarId = new mongo.ObjectId();
  const manualCarId = new mongo.ObjectId();

  const { service, cars, files, deletedFileIds } = createMediaHarness({
    maxBytes: 500,
    cars: [
      { _id: manualCarId, source: 'Manual', auctionDate: '2026-11-01', images: [gridUrl(manualImg)] },
      { _id: newerCarId, source: 'A-Automarket', auctionDate: '2026-12-05', images: [gridUrl(newerScrapedImg)] },
      { _id: olderCarId, source: 'A-Automarket', auctionDate: '2026-12-01', images: [gridUrl(olderScrapedImg)] },
    ],
    handovers: [{ imageUrl: gridUrl(handoverImg) }],
    files: [
      { _id: manualImg, length: 150, uploadDate: new Date('2026-11-01T00:00:00Z') },
      { _id: handoverImg, length: 100, uploadDate: new Date('2026-11-01T00:00:00Z') },
      { _id: olderScrapedImg, length: 200, uploadDate: new Date('2026-11-24T00:00:00Z') },
      { _id: newerScrapedImg, length: 150, uploadDate: new Date('2026-11-25T00:00:00Z') },
    ],
  });
  t.mock.method(service['logger'], 'log', () => undefined);

  await service.saveImage({
    buffer: Buffer.alloc(100),
    contentType: 'image/webp',
    filename: 'fresh.webp',
  });

  assert.deepEqual(deletedFileIds, [String(olderScrapedImg)]);
  assert.deepEqual(
    cars.map((car) => String(car._id)).sort(),
    [String(manualCarId), String(newerCarId)].sort(),
  );
  assert.ok(files.reduce((sum, file) => sum + file.length, 0) <= 500);
});

test('serializes concurrent uploads so image chunks never exceed the budget', async (t) => {
  const oldImg1 = new mongo.ObjectId();
  const oldImg2 = new mongo.ObjectId();
  const { service, files } = createMediaHarness({
    maxBytes: 500,
    cars: [
      { _id: new mongo.ObjectId(), source: 'A-Automarket', auctionDate: '2026-11-10', images: [gridUrl(oldImg1)] },
      { _id: new mongo.ObjectId(), source: 'A-Automarket', auctionDate: '2026-11-11', images: [gridUrl(oldImg2)] },
    ],
    files: [
      { _id: oldImg1, length: 250, uploadDate: new Date('2026-11-10T00:00:00Z') },
      { _id: oldImg2, length: 250, uploadDate: new Date('2026-11-11T00:00:00Z') },
    ],
  });
  t.mock.method(service['logger'], 'log', () => undefined);

  await Promise.all([
    service.saveImage({ buffer: Buffer.alloc(200), contentType: 'image/webp', filename: 'a.webp' }),
    service.saveImage({ buffer: Buffer.alloc(200), contentType: 'image/webp', filename: 'b.webp' }),
  ]);

  assert.ok(files.reduce((sum, file) => sum + file.length, 0) <= 500);
});
