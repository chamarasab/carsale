import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { WebsiteValue, WebsiteValueSchema } from './website-value.schema';
import { WebsiteValuesController } from './website-values.controller';
import { WebsiteValuesService } from './website-values.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: WebsiteValue.name, schema: WebsiteValueSchema },
    ]),
  ],
  controllers: [WebsiteValuesController],
  providers: [WebsiteValuesService],
  exports: [WebsiteValuesService],
})
export class WebsiteValuesModule {}
