import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { WebsiteValue, WebsiteValueSchema } from './website-value.schema';
import { WebsiteValueMiss, WebsiteValueMissSchema } from './website-value-miss.schema';
import { WebsiteValuesController } from './website-values.controller';
import { WebsiteValuesService } from './website-values.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: WebsiteValue.name, schema: WebsiteValueSchema },
      { name: WebsiteValueMiss.name, schema: WebsiteValueMissSchema },
    ]),
  ],
  controllers: [WebsiteValuesController],
  providers: [WebsiteValuesService],
  exports: [WebsiteValuesService],
})
export class WebsiteValuesModule {}
