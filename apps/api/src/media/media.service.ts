import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, mongo } from 'mongoose';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { colomboDateKey, normalizeAuctionDate, SCRAPED_AUCTION_SOURCES } from '../cars/auction-dates';

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

type PrunableCar = {
  _id: unknown;
  auctionDate?: string;
  createdAt?: Date | string;
  images?: string[];
};

const IMAGE_DELETE_BATCH_SIZE = 8;
const ORPHAN_GRACE_PERIOD_MS = 60 * 60 * 1_000;
const DEFAULT_MAX_IMAGE_CHUNKS_BYTES = 450_000_000;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly bucket: mongo.GridFSBucket;
  private readonly connection: Connection;
  private storageLock: Promise<unknown> = Promise.resolve();

  constructor(
    @InjectConnection() connection: Connection,
    private readonly config: ConfigService,
  ) {
    if (!connection.db) throw new Error('MongoDB connection is not ready');
    this.connection = connection;
    this.bucket = new mongo.GridFSBucket(connection.db, { bucketName: 'images' });
  }

  async saveImage({ buffer, contentType, filename, sourceUrl, source, width, height, imageKind }: SaveImageOptions) {
    return this.withStorageLock(async () => {
      await this.ensureStorageCapacityUnlocked(buffer.length);
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
    });
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
    const ids = [...new Set(urls.map(gridFsImageId).filter((id): id is string => Boolean(id)))];
    const result = await this.deleteGridFsIds(ids);
    return result.deletedImages;
  }

  async deleteCarsAndUnreferencedImages(carsToDelete: Array<{ _id: unknown; images?: string[] }>) {
    const db = this.connection.db;
    if (!db || !carsToDelete.length) {
      return { deletedCars: 0, deletedImages: 0, deletedBytes: 0 };
    }

    const carIds = carsToDelete.map((car) => car._id);
    const candidateImageIds = [
      ...new Set(
        carsToDelete
          .flatMap((car) => (Array.isArray(car.images) ? car.images : []))
          .map(gridFsImageId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const deletion = await db.collection('cars').deleteMany({ _id: { $in: carIds as mongo.ObjectId[] } });
    const referencedIds = await this.referencedGridFsIds(db);
    const unreferencedIds = candidateImageIds.filter((id) => !referencedIds.has(id));
    const imageCleanup = await this.deleteGridFsIds(unreferencedIds);

    return {
      deletedCars: deletion.deletedCount,
      deletedImages: imageCleanup.deletedImages,
      deletedBytes: imageCleanup.deletedBytes,
    };
  }

  async deleteOrphanedImages(gracePeriodMs = ORPHAN_GRACE_PERIOD_MS) {
    const db = this.connection.db;
    if (!db) return { deletedImages: 0, deletedBytes: 0 };

    const referencedIds = await this.referencedGridFsIds(db);
    const uploadedBefore = new Date(Date.now() - Math.max(0, gracePeriodMs));
    const orphaned = await db.collection('images.files')
      .find({ uploadDate: { $lt: uploadedBefore } }, { projection: { _id: 1 } })
      .toArray();
    const unreferencedIds = orphaned
      .map((file) => String(file._id))
      .filter((id) => !referencedIds.has(id));

    return this.deleteGridFsIds(unreferencedIds);
  }

  async ensureStorageCapacity(incomingBytes = 0, today = colomboDateKey()) {
    return this.withStorageLock(() => this.ensureStorageCapacityUnlocked(incomingBytes, today));
  }

  async getImageChunksBytes() {
    const db = this.connection.db;
    if (!db) return 0;

    if (typeof db.command === 'function') {
      try {
        const stats = await db.command({ collStats: 'images.chunks' });
        if (stats && typeof stats.size === 'number') return stats.size;
      } catch (error) {
        const mongoError = error as { code?: number; codeName?: string };
        if (mongoError.code === 26 || mongoError.codeName === 'NamespaceNotFound') return 0;
      }
    }

    const files = await db.collection('images.files')
      .find({}, { projection: { length: 1 } })
      .toArray();
    return files.reduce((total, file) => total + Number(file.length || 0), 0);
  }

  private async ensureStorageCapacityUnlocked(incomingBytes = 0, today = colomboDateKey()) {
    const db = this.connection.db;
    const maxBytes = this.maxImageStorageBytes();
    if (!db) return { deletedCars: 0, deletedImages: 0, deletedBytes: 0, currentBytes: 0, maxBytes };

    let currentBytes = await this.getImageChunksBytes();
    if (currentBytes + incomingBytes <= maxBytes) {
      return { deletedCars: 0, deletedImages: 0, deletedBytes: 0, currentBytes, maxBytes };
    }

    let deletedCars = 0;
    let deletedImages = 0;
    let deletedBytes = 0;

    const scrapedCars = (await db.collection('cars')
      .find(
        { source: { $in: [...SCRAPED_AUCTION_SOURCES] } },
        { projection: { _id: 1, auctionDate: 1, createdAt: 1, images: 1 } },
      )
      .toArray()) as unknown as PrunableCar[];

    const expiredCars = scrapedCars.filter((car) => {
      const date = normalizeAuctionDate(car.auctionDate);
      return date !== undefined && date < today;
    });
    if (expiredCars.length) {
      const expiredCleanup = await this.deleteCarsAndUnreferencedImages(expiredCars);
      deletedCars += expiredCleanup.deletedCars;
      deletedImages += expiredCleanup.deletedImages;
      deletedBytes += expiredCleanup.deletedBytes;
      currentBytes = await this.getImageChunksBytes();
    }

    if (currentBytes + incomingBytes > maxBytes) {
      const orphanCleanup = await this.deleteOrphanedImages(ORPHAN_GRACE_PERIOD_MS);
      deletedImages += orphanCleanup.deletedImages;
      deletedBytes += orphanCleanup.deletedBytes;
      currentBytes = await this.getImageChunksBytes();
    }

    if (currentBytes + incomingBytes > maxBytes) {
      const expiredIds = new Set(expiredCars.map((car) => String(car._id)));
      const activeOldestFirst = scrapedCars
        .filter((car) => !expiredIds.has(String(car._id)))
        .sort(compareOldestScrapedCars);

      for (const car of activeOldestFirst) {
        if (currentBytes + incomingBytes <= maxBytes) break;
        const cleanup = await this.deleteCarsAndUnreferencedImages([car]);
        deletedCars += cleanup.deletedCars;
        deletedImages += cleanup.deletedImages;
        deletedBytes += cleanup.deletedBytes;
        currentBytes = await this.getImageChunksBytes();
      }
    }

    this.logger.log(
      `[IMAGE STORAGE BUDGET] freedCars=${deletedCars} freedImages=${deletedImages} freedBytes=${deletedBytes} currentBytes=${currentBytes} incomingBytes=${incomingBytes} maxBytes=${maxBytes}`,
    );
    if (currentBytes + incomingBytes > maxBytes) {
      this.logger.warn(
        `[IMAGE STORAGE BUDGET] Remaining storage (${currentBytes + incomingBytes} bytes) exceeds target (${maxBytes} bytes) after pruning scraped listings`,
      );
    }

    return { deletedCars, deletedImages, deletedBytes, currentBytes, maxBytes };
  }

  private async referencedGridFsIds(db: NonNullable<Connection['db']>) {
    const [cars, handovers] = await Promise.all([
      db.collection('cars').find({ 'images.0': { $exists: true } }, { projection: { images: 1 } }).toArray(),
      db.collection('customerhandovers').find({}, { projection: { imageUrl: 1 } }).toArray(),
    ]);
    return new Set(
      [
        ...cars.flatMap((car) => (Array.isArray(car.images) ? car.images : [])),
        ...handovers.map((handover) => handover.imageUrl),
      ]
        .map((url) => gridFsImageId(typeof url === 'string' ? url : ''))
        .filter((id): id is string => Boolean(id)),
    );
  }

  private async deleteGridFsIds(ids: string[]) {
    let deletedImages = 0;
    let deletedBytes = 0;
    for (let index = 0; index < ids.length; index += IMAGE_DELETE_BATCH_SIZE) {
      const results = await Promise.all(
        ids.slice(index, index + IMAGE_DELETE_BATCH_SIZE).map(async (id) => {
          if (!mongo.ObjectId.isValid(id)) return -1;
          const objectId = new mongo.ObjectId(id);
          const file = await this.bucket.find({ _id: objectId }).next();
          if (!file) return -1;
          await this.bucket.delete(objectId);
          return Number(file.length || 0);
        }),
      );
      for (const length of results) {
        if (length < 0) continue;
        deletedImages += 1;
        deletedBytes += length;
      }
    }
    return { deletedImages, deletedBytes };
  }

  private maxImageStorageBytes() {
    const configured = Number(this.config?.get<string>('IMAGE_STORAGE_MAX_BYTES'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_IMAGE_CHUNKS_BYTES;
  }

  private withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.storageLock.then(operation, operation);
    this.storageLock = next.catch(() => undefined);
    return next;
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

function compareOldestScrapedCars(a: PrunableCar, b: PrunableCar) {
  const dateComparison = (normalizeAuctionDate(a.auctionDate) ?? '9999-99-99').localeCompare(
    normalizeAuctionDate(b.auctionDate) ?? '9999-99-99',
  );
  if (dateComparison !== 0) return dateComparison;

  const createdComparison = timestamp(a.createdAt) - timestamp(b.createdAt);
  if (createdComparison !== 0) return createdComparison;

  return String(a._id).localeCompare(String(b._id));
}

function timestamp(value?: Date | string) {
  if (!value) return 0;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}
