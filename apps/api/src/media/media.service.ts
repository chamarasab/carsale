import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, mongo } from 'mongoose';
import { extname } from 'node:path';
import { Readable } from 'node:stream';

type SaveImageOptions = {
  buffer: Buffer;
  contentType: string;
  filename: string;
  sourceUrl?: string;
  source?: string;
  width?: number;
  height?: number;
  imageKind?: 'vehicle-photo' | 'auction-sheet';
};

const IMAGE_DELETE_BATCH_SIZE = 8;
const ORPHAN_GRACE_PERIOD_MS = 60 * 60 * 1_000;

@Injectable()
export class MediaService {
  private readonly bucket: mongo.GridFSBucket;
  private readonly connection: Connection;

  constructor(
    @InjectConnection() connection: Connection,
    private readonly config: ConfigService,
  ) {
    if (!connection.db) throw new Error('MongoDB connection is not ready');
    this.connection = connection;
    this.bucket = new mongo.GridFSBucket(connection.db, { bucketName: 'images' });
  }

  async saveImage({ buffer, contentType, filename, sourceUrl, source, width, height, imageKind }: SaveImageOptions) {
    const safeFilename = this.safeFilename(filename);
    const id = new mongo.ObjectId();

    await new Promise<void>((resolve, reject) => {
      const upload = this.bucket.openUploadStreamWithId(id, safeFilename, {
        metadata: {
          contentType: contentType || this.contentTypeFromFilename(safeFilename),
          source,
          sourceUrl,
          width,
          height,
          imageKind,
          uploadedAt: new Date(),
        },
      });
      Readable.from(buffer).pipe(upload).on('error', reject).on('finish', () => resolve());
    });

    return `${this.publicBaseUrl()}/images/gridfs/${id.toHexString()}/${encodeURIComponent(safeFilename)}`;
  }

  async openDownloadStream(id: string) {
    if (!mongo.ObjectId.isValid(id)) throw new NotFoundException('Image not found');
    const objectId = new mongo.ObjectId(id);
    const file = await this.bucket.find({ _id: objectId }).next();
    if (!file) throw new NotFoundException('Image not found');

    return {
      file,
      stream: this.bucket.openDownloadStream(objectId),
    };
  }

  async deleteImages(urls: string[]) {
    const ids = new Set(
      urls
        .map(gridFsImageId)
        .filter((id): id is string => Boolean(id)),
    );

    const imageIds = [...ids];
    let deleted = 0;
    for (let index = 0; index < imageIds.length; index += IMAGE_DELETE_BATCH_SIZE) {
      const results = await Promise.all(
        imageIds.slice(index, index + IMAGE_DELETE_BATCH_SIZE).map(async (id) => {
          const objectId = new mongo.ObjectId(id);
          const exists = await this.bucket.find({ _id: objectId }).hasNext();
          if (!exists) return false;
          await this.bucket.delete(objectId);
          return true;
        }),
      );
      deleted += results.filter(Boolean).length;
    }
    return deleted;
  }

  async deleteOrphanedImages(gracePeriodMs = ORPHAN_GRACE_PERIOD_MS) {
    const db = this.connection.db;
    if (!db) return { deletedImages: 0, deletedBytes: 0 };

    const [cars, handovers] = await Promise.all([
      db.collection('cars').find({}, { projection: { images: 1 } }).toArray(),
      db.collection('customerhandovers').find({}, { projection: { imageUrl: 1 } }).toArray(),
    ]);
    const referencedIds = new Set(
      [
        ...cars.flatMap((car) => Array.isArray(car.images) ? car.images : []),
        ...handovers.map((handover) => handover.imageUrl),
      ]
        .map((url) => gridFsImageId(typeof url === 'string' ? url : ''))
        .filter((id): id is string => Boolean(id)),
    );
    const uploadedBefore = new Date(Date.now() - Math.max(0, gracePeriodMs));
    const orphaned = await db.collection('images.files')
      .find({ uploadDate: { $lt: uploadedBefore } }, { projection: { _id: 1, length: 1 } })
      .toArray();
    const unreferenced = orphaned.filter((file) => !referencedIds.has(String(file._id)));

    let deletedImages = 0;
    let deletedBytes = 0;
    for (let index = 0; index < unreferenced.length; index += IMAGE_DELETE_BATCH_SIZE) {
      const files = unreferenced.slice(index, index + IMAGE_DELETE_BATCH_SIZE);
      const results = await Promise.all(files.map(async (file) => {
        await this.bucket.delete(file._id as mongo.ObjectId);
        return Number(file.length || 0);
      }));
      deletedImages += results.length;
      deletedBytes += results.reduce((total, length) => total + length, 0);
    }

    return { deletedImages, deletedBytes };
  }

  private publicBaseUrl() {
    return (
      this.config.get<string>('API_PUBLIC_URL') ||
      this.config.get<string>('RENDER_EXTERNAL_URL') ||
      'http://localhost:4000'
    ).replace(/\/$/, '');
  }

  private safeFilename(filename: string) {
    const extension = extname(filename) || '.jpg';
    const stem = filename
      .replace(extension, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    return `${stem || 'image'}${extension.toLowerCase()}`;
  }

  private contentTypeFromFilename(filename: string) {
    const extension = extname(filename).toLowerCase();
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    if (extension === '.gif') return 'image/gif';
    return 'image/jpeg';
  }
}

export function gridFsImageId(url: string) {
  return url.match(/\/images\/gridfs\/([a-f\d]{24})(?:\/|$)/i)?.[1];
}
