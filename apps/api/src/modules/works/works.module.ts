import { Module } from "@nestjs/common";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";
import { WorksScheduler } from "./works.scheduler";
import { ChapterMarksService } from "./chapter-marks.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { EngagementModule } from "../engagement/engagement.module";

@Module({
  imports: [NotificationsModule, EngagementModule],
  controllers: [WorksController],
  providers: [WorksService, WorksScheduler, ChapterMarksService],
  exports: [WorksService, ChapterMarksService],
})
export class WorksModule {}
