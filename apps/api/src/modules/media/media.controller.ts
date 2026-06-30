import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

/** Media-Endpoints: Upload, Transcode, Metadaten (F-081/082/083/084/092). */
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  // GET /api/v1/media/upload-config – Batch-Upload Konfiguration (F-082/F-083)
  @Get('upload-config')
  uploadConfig() {
    return this.media.getBatchUploadConfig();
  }

  // GET /api/v1/media/transcode/:workId – Transkodierungs-Config (F-084)
  @Get('transcode')
  transcodeConfig(@Query('workId') workId: string) {
    return this.media.getTranscodeConfig(workId ?? 'unknown');
  }

  // POST /api/v1/media/extract-metadata – ID3/FLAC-Tag-Extraktion (F-092)
  @Post('extract-metadata')
  extractMetadata(@Body('filename') filename: string, @Body('fileType') fileType: string) {
    return this.media.extractMetadata(filename ?? '', fileType ?? 'mp3');
  }
}
