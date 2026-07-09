import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import sharp = require('sharp');
import { MediaService } from '../media/media.service';

const MAX_OUTPUT_BYTES = 1024 * 1024;

@Injectable()
export class UploadsService {
  constructor(private readonly mediaService: MediaService) {}

  async saveImages(files: Express.Multer.File[]) {
    if (!files.length) throw new BadRequestException('Select at least one image');

    return Promise.all(
      files.map(async (file, index) => {
        if (!file.mimetype.startsWith('image/')) {
          throw new BadRequestException(`${file.originalname} is not an image`);
        }

        const buffer = await this.compress(file.buffer);
        const base = file.originalname
          .replace(extname(file.originalname), '')
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 50)
          .toLowerCase() || 'vehicle';
        const filename = `${Date.now()}-${index}-${base}.webp`;
        return this.mediaService.saveImage({
          buffer,
          contentType: 'image/webp',
          filename,
          source: 'admin-upload',
        });
      }),
    );
  }

  private async compress(input: Buffer) {
    const image = sharp(input, { failOn: 'none' }).rotate().resize({
      width: 1280,
      height: 720,
      fit: 'inside',
      withoutEnlargement: true,
    });

    for (const quality of [82, 74, 66, 58, 50, 42]) {
      const output = await image.clone().webp({ quality, effort: 5 }).toBuffer();
      if (output.length <= MAX_OUTPUT_BYTES || quality === 42) return output;
    }

    throw new BadRequestException('Image could not be compressed');
  }
}
