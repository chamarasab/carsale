#!/usr/bin/env node

const { createReadStream, existsSync } = require('node:fs');
const { stat } = require('node:fs/promises');
const { extname, join } = require('node:path');
require('dotenv').config({ path: join(__dirname, '..', '.env') });
require('dotenv').config();

const { GridFSBucket, MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'carsale';
const API_PUBLIC_URL = (
  process.env.API_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://carsale-1.onrender.com'
).replace(/\/$/, '');

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(MONGODB_DB);
    const cars = db.collection('cars');
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    const cursor = cars.find({ images: { $elemMatch: { $regex: '/images/(jpcenter|automarket|uploads)/' } } });

    let scanned = 0;
    let updated = 0;
    let uploaded = 0;
    let reused = 0;
    let missing = 0;

    for await (const car of cursor) {
      scanned += 1;
      const nextImages = [];
      let changed = false;

      for (const imageUrl of car.images || []) {
        const relativeImage = relativeImagePath(imageUrl);
        if (!relativeImage) {
          nextImages.push(imageUrl);
          continue;
        }

        const localPath = resolveLocalImage(relativeImage);
        if (!localPath || !existsSync(localPath)) {
          missing += 1;
          console.warn(`[missing] ${relativeImage}`);
          nextImages.push(imageUrl);
          continue;
        }

        const filename = relativeImage.split('/').pop() || `image${extname(localPath) || '.jpg'}`;
        const existing = await db.collection('images.files').findOne({ 'metadata.localPath': relativeImage });
        if (existing) {
          reused += 1;
          nextImages.push(gridfsUrl(existing._id, existing.filename || filename));
        } else {
          const id = await upload(bucket, localPath, filename, relativeImage, imageUrl);
          uploaded += 1;
          nextImages.push(gridfsUrl(id, filename));
        }
        changed = true;
      }

      if (changed) {
        await cars.updateOne({ _id: car._id }, { $set: { images: nextImages } });
        updated += 1;
        console.log(`[updated] ${car.title || car._id} images=${nextImages.length}`);
      }
    }

    console.log(JSON.stringify({ scanned, updated, uploaded, reused, missing }, null, 2));
  } finally {
    await client.close();
  }
}

function relativeImagePath(url) {
  const match = String(url).match(/\/images\/((?:jpcenter|automarket|uploads)\/[^?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function resolveLocalImage(relativeImage) {
  const candidates = [
    join(__dirname, '..', 'public', 'images', relativeImage),
    join(process.cwd(), 'apps/api/public/images', relativeImage),
    join(process.cwd(), 'public/images', relativeImage),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

async function upload(bucket, localPath, filename, relativeImage, originalUrl) {
  const id = new ObjectId();
  const fileStat = await stat(localPath);

  await new Promise((resolve, reject) => {
    createReadStream(localPath)
      .pipe(
        bucket.openUploadStreamWithId(id, safeFilename(filename), {
          metadata: {
            contentType: contentTypeFromFilename(filename),
            localPath: relativeImage,
            originalUrl,
            migratedAt: new Date(),
            size: fileStat.size,
          },
        }),
      )
      .on('error', reject)
      .on('finish', resolve);
  });

  return id;
}

function gridfsUrl(id, filename) {
  return `${API_PUBLIC_URL}/images/gridfs/${id.toString()}/${encodeURIComponent(safeFilename(filename))}`;
}

function safeFilename(filename) {
  const extension = extname(filename) || '.jpg';
  const stem = filename
    .replace(extension, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${stem || 'image'}${extension.toLowerCase()}`;
}

function contentTypeFromFilename(filename) {
  const extension = extname(filename).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  return 'image/jpeg';
}
