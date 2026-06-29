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
import { SubtitlesService } from "./subtitles.service";
import { LyricsService } from "./lyrics.service";
import { WorkTranslationsService } from "./translations.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { EngagementModule } from "../engagement/engagement.module";
import { CollectionsService } from "./collections.service";
import { SitemapService } from "./sitemap.service";
import { SitemapController } from "./sitemap.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [NotificationsModule, EngagementModule],
  controllers: [WorksController, SeriesController, RecommendationsController, SitemapController],
  providers: [WorksService, WorksScheduler, ChapterMarksService, SeriesService, TranscriptsService, RecommendationsService, SubtitlesService, LyricsService, WorkTranslationsService, CollectionsService, SitemapService, AiService],
  exports: [WorksService, ChapterMarksService, SeriesService, TranscriptsService, RecommendationsService, SubtitlesService, LyricsService, WorkTranslationsService, CollectionsService, SitemapService, AiService],
})
export class WorksModule {}
