import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp = require('sharp');

const MAX_OUTPUT_BYTES = 1024 * 1024;

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  async saveImages(files: Express.Multer.File[]) {
    if (!files.length) throw new BadRequestException('Select at least one image');

    const uploadDir = this.resolveUploadDir();
    await mkdir(uploadDir, { recursive: true });

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
        await writeFile(join(uploadDir, filename), buffer);
        return `${this.publicBaseUrl()}/images/uploads/${filename}`;
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

  private resolveUploadDir() {
    const configured = this.config.get<string>('UPLOAD_DIR');
    if (configured) return configured;
    const relative = 'public/images/uploads';
    return existsSync(join(process.cwd(), 'src'))
      ? join(process.cwd(), relative)
      : join(process.cwd(), 'apps/api', relative);
  }

  private publicBaseUrl() {
    return (
      this.config.get<string>('API_PUBLIC_URL') ||
      this.config.get<string>('RENDER_EXTERNAL_URL') ||
      'http://localhost:4000'
    ).replace(/\/$/, '');
  }
}
