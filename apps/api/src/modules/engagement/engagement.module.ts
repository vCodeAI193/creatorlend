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

@Module({
  controllers: [EngagementController, ArtistPostsController, MessagesController],
  providers: [FavoritesService, FollowsService, WishlistService, RatingsService, ReviewsService, ArtistPostsService, MessagesService, BlocksService, BookmarksService, FaqsService],
  exports: [FavoritesService, FollowsService, WishlistService, RatingsService, ReviewsService, ArtistPostsService, MessagesService, BlocksService, BookmarksService, FaqsService],
})
export class EngagementModule {}
