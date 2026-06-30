import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { AdminTrackingController, TrackingController } from './tracking.controller';

@Module({
  controllers: [TrackingController, AdminTrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
