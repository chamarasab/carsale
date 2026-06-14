import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const clientOrigin = config.get<string>('CLIENT_ORIGIN') ?? 'http://localhost:3000';

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use('/health', (_req: express.Request, res: express.Response) => res.json({ ok: true }));
  const imagesDir = resolveApiPath('public/images');
  await mkdir(imagesDir, { recursive: true });
  app.use('/images', express.static(imagesDir));
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
