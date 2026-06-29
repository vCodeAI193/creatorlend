import { Module } from "@nestjs/common";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";
import { WorksScheduler } from "./works.scheduler";
import { ChapterMarksService } from "./chapter-marks.service";
import { SeriesService } from "./series.service";
import { SeriesController } from "./series.controller";
import { TranscriptsService } from "./transcripts.service";
import { RecommendationsService } from "./recommendations.service";
import { RecommendationsController } from "./recommendations.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { EngagementModule } from "../engagement/engagement.module";

@Module({
  imports: [NotificationsModule, EngagementModule],
  controllers: [WorksController, SeriesController, RecommendationsController],
  providers: [WorksService, WorksScheduler, ChapterMarksService, SeriesService, TranscriptsService, RecommendationsService],
  exports: [WorksService, ChapterMarksService, SeriesService, TranscriptsService, RecommendationsService],
})
export class WorksModule {}
