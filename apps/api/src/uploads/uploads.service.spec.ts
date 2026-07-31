import { BadRequestException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { UploadsService } from './uploads.service';

test('validates and compresses uploaded images below one megabyte', async () => {
  let savedBuffer: Buffer | undefined;
  const mediaService = {
    saveImage: async ({ buffer }: { buffer: Buffer }) => {
      savedBuffer = buffer;
      return 'https://example.com/images/test.webp';
    },
  };
  const service = new UploadsService(mediaService as never);
  const buffer = await readFile(
    resolve(process.cwd(), '../client/public/genuine-automobiles-logo-transparent.png'),
  );

  const urls = await service.saveImages([
    {
      buffer,
      mimetype: 'image/png',
      originalname: 'vehicle logo.png',
    } as Express.Multer.File,
  ]);

  assert.deepEqual(urls, ['https://example.com/images/test.webp']);
  assert.ok(savedBuffer);
  assert.ok(savedBuffer.length <= 1024 * 1024);
});

test('rejects content that only claims to be an image', async () => {
  const service = new UploadsService({ saveImage: async () => '' } as never);

  await assert.rejects(
    () =>
      service.saveImages([
        {
          buffer: Buffer.from('not an image'),
          mimetype: 'image/png',
          originalname: 'fake.png',
        } as Express.Multer.File,
      ]),
    BadRequestException,
  );
});
