import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateWebsiteValueDto, UpdateWebsiteValueDto } from './dto';
import { WebsiteValuesService } from './website-values.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('website-values')
export class WebsiteValuesController {
  constructor(private readonly websiteValuesService: WebsiteValuesService) {}

  @Get()
  findAll() {
    return this.websiteValuesService.findAll();
  }

  @Get('missing')
  findMissing() {
    return this.websiteValuesService.findMissing();
  }

  @Post()
  create(@Body() dto: CreateWebsiteValueDto) {
    return this.websiteValuesService.create(dto);
  }

  @Post('refresh')
  refresh() {
    return this.websiteValuesService.refreshKnownSources();
  }

  @Patch('missing/:id/ignore')
  ignoreMissing(@Param('id') id: string) {
    return this.websiteValuesService.ignoreMissing(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebsiteValueDto) {
    return this.websiteValuesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.websiteValuesService.remove(id);
  }
}
