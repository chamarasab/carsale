import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { MediaService } from './media/media.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const clientOrigin = config.get<string>('CLIENT_ORIGIN') ?? 'http://localhost:3000';

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use('/health', (_req: express.Request, res: express.Response) => res.json({ ok: true }));
  const imagesDir = resolveApiPath('public/images');
  const uploadDir = config.get<string>('UPLOAD_DIR') || join(imagesDir, 'uploads');
  await mkdir(imagesDir, { recursive: true });
  await mkdir(uploadDir, { recursive: true });
  app.use('/images/uploads', express.static(uploadDir));
  app.use('/images', express.static(imagesDir));
  const mediaService = app.get(MediaService);
  app.use('/images/gridfs/:id/:filename', async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    try {
      const imageId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
      const { file, stream } = await mediaService.openDownloadStream(imageId);
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      response.setHeader('Content-Type', file.metadata?.contentType || 'application/octet-stream');
      response.setHeader('Content-Length', file.length);
      stream.on('error', next).pipe(response);
    } catch (error) {
      next(error);
    }
  });
  app.enableCors({
    origin: clientOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();

function resolveApiPath(relativePath: string) {
  const cwdPath = join(process.cwd(), relativePath);
  if (existsSync(join(process.cwd(), 'src'))) return cwdPath;
  return join(process.cwd(), 'apps/api', relativePath);
}
