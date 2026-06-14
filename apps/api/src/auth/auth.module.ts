import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleJwtGuard } from './google-jwt.guard';

@Module({
  imports: [ConfigModule],
  providers: [GoogleJwtGuard],
  exports: [GoogleJwtGuard],
})
export class AuthModule {}
