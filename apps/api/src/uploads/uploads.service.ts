import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import sharp from 'sharp';
import { MediaService } from '../media/media.service';

const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const SUPPORTED_FORMATS = new Set(['avif', 'gif', 'heif', 'jpeg', 'png', 'tiff', 'webp']);

@Injectable()
export class UploadsService {
  constructor(private readonly mediaService: MediaService) {}

  async saveImages(files: Express.Multer.File[]) {
    if (!files.length) throw new BadRequestException('Select at least one image');

    const images: string[] = [];
    for (const [index, file] of files.entries()) {
      await this.validateImage(file);
      const buffer = await this.compress(file.buffer);
      const base = file.originalname
        .replace(extname(file.originalname), '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)
        .toLowerCase() || 'vehicle';
      const filename = `${Date.now()}-${index}-${base}.webp`;
      images.push(
        await this.mediaService.saveImage({
          buffer,
          contentType: 'image/webp',
          filename,
          source: 'admin-upload',
        }),
      );
    }
    return images;
  }

  private async validateImage(file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(`${file.originalname} is not an image`);
    }

    try {
      const metadata = await sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();
      if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format)) {
        throw new Error('Unsupported image format');
      }
    } catch {
      throw new BadRequestException(`${file.originalname} is not a valid supported image`);
    }
  }

  private async compress(input: Buffer) {
    for (const width of [1280, 1120, 960]) {
      const image = sharp(input, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
      }).rotate().resize({
        width,
        height: 720,
        fit: 'inside',
        withoutEnlargement: true,
      });

      for (const quality of [82, 74, 66, 58, 50, 42]) {
        const output = await image.clone().webp({ quality, effort: 5 }).toBuffer();
        if (output.length <= MAX_OUTPUT_BYTES) return output;
      }
    }

    throw new BadRequestException('Image could not be reduced below 1 MB');
  }
}
