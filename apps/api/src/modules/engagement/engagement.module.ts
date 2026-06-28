import { Module } from "@nestjs/common";
import { EngagementController } from "./engagement.controller";
import { FavoritesService } from "./favorites.service";
import { FollowsService } from "./follows.service";
import { WishlistService } from "./wishlist.service";
import { RatingsService } from "./ratings.service";
import { ReviewsService } from "./reviews.service";

@Module({
  controllers: [EngagementController],
  providers: [FavoritesService, FollowsService, WishlistService, RatingsService, ReviewsService],
  exports: [FavoritesService, FollowsService, WishlistService, RatingsService, ReviewsService],
})
export class EngagementModule {}
