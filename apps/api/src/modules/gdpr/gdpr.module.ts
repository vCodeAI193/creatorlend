import { Module } from '@nestjs/common';
import { GdprService } from './gdpr.service';
import { GdprController, AdminGdprController } from './gdpr.controller';

@Module({
  controllers: [GdprController, AdminGdprController],
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
