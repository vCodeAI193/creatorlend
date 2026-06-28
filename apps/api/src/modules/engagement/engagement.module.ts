import { Module } from "@nestjs/common";
import { EngagementController } from "./engagement.controller";
import { FavoritesService } from "./favorites.service";
import { FollowsService } from "./follows.service";
import { WishlistService } from "./wishlist.service";

@Module({
  controllers: [EngagementController],
  providers: [FavoritesService, FollowsService, WishlistService],
  exports: [FavoritesService, FollowsService, WishlistService],
})
export class EngagementModule {}
