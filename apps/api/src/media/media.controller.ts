import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';

@Controller('images/gridfs')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':id/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async getImage(@Param('id') id: string, @Res() response: Response) {
    const { file, stream } = await this.mediaService.openDownloadStream(id);
    response.setHeader('Content-Type', file.metadata?.contentType || 'application/octet-stream');
    response.setHeader('Content-Length', file.length);
    stream.pipe(response);
  }
}
