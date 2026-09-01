import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CustomerHandoversService } from './customer-handovers.service';

@Controller('customer-handovers')
export class CustomerHandoversController {
  constructor(private readonly customerHandoversService: CustomerHandoversService) {}

  @Get()
  findAll() {
    return this.customerHandoversService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Select an image');
    return this.customerHandoversService.create(file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.customerHandoversService.remove(id);
  }
}
