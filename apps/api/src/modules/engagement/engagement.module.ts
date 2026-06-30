import { Module } from "@nestjs/common";
import { EngagementController } from "./engagement.controller";
import { FavoritesService } from "./favorites.service";
import { FollowsService } from "./follows.service";
import { WishlistService } from "./wishlist.service";
import { RatingsService } from "./ratings.service";
import { ReviewsService } from "./reviews.service";
import { ArtistPostsService } from "./artist-posts.service";
import { ArtistPostsController } from "./artist-posts.controller";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { BlocksService } from "./blocks.service";
import { BookmarksService } from "./bookmarks.service";
import { FaqsService } from "./faqs.service";
import { ReadingChallengeService } from "./reading-challenge.service";
import { WorkNotesService } from "./work-notes.service";
import { WorkNotesController } from "./work-notes.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { ContentFeedbackService } from "./content-feedback.service";
import { RecommendationsService } from "./recommendations.service";

@Module({
  imports: [NotificationsModule],
  controllers: [EngagementController, ArtistPostsController, MessagesController, WorkNotesController],
  providers: [FavoritesService, FollowsService, WishlistService, RatingsService, ReviewsService, ArtistPostsService, MessagesService, BlocksService, BookmarksService, FaqsService, ReadingChallengeService, WorkNotesService, ContentFeedbackService, RecommendationsService],
  exports: [FavoritesService, FollowsService, WishlistService, RatingsService, ReviewsService, ArtistPostsService, MessagesService, BlocksService, BookmarksService, FaqsService, ReadingChallengeService, WorkNotesService, ContentFeedbackService, RecommendationsService],
})
export class EngagementModule {}
