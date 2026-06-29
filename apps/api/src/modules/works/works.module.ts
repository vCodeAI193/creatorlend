import { Module } from "@nestjs/common";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";
import { WorksScheduler } from "./works.scheduler";
import { ChapterMarksService } from "./chapter-marks.service";
import { SeriesService } from "./series.service";
import { SeriesController } from "./series.controller";
import { TranscriptsService } from "./transcripts.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { EngagementModule } from "../engagement/engagement.module";

@Module({
  imports: [NotificationsModule, EngagementModule],
  controllers: [WorksController, SeriesController],
  providers: [WorksService, WorksScheduler, ChapterMarksService, SeriesService, TranscriptsService],
  exports: [WorksService, ChapterMarksService, SeriesService, TranscriptsService],
})
export class WorksModule {}
