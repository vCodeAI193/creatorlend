import { Module } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { SurveysController, AdminSurveysController } from './surveys.controller';

@Module({
  controllers: [SurveysController, AdminSurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
