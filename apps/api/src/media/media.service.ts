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
};

@Injectable()
export class MediaService {
  private readonly bucket: mongo.GridFSBucket;

  constructor(
    @InjectConnection() connection: Connection,
    private readonly config: ConfigService,
  ) {
    if (!connection.db) throw new Error('MongoDB connection is not ready');
    this.bucket = new mongo.GridFSBucket(connection.db, { bucketName: 'images' });
  }

  async saveImage({ buffer, contentType, filename, sourceUrl, source }: SaveImageOptions) {
    const safeFilename = this.safeFilename(filename);
    const id = new mongo.ObjectId();

    await new Promise<void>((resolve, reject) => {
      const upload = this.bucket.openUploadStreamWithId(id, safeFilename, {
        metadata: {
          contentType: contentType || this.contentTypeFromFilename(safeFilename),
          source,
          sourceUrl,
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
