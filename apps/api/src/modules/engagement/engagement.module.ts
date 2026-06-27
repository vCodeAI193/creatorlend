import { Module } from "@nestjs/common";
import { EngagementController } from "./engagement.controller";
import { FavoritesService } from "./favorites.service";
import { FollowsService } from "./follows.service";

@Module({
  controllers: [EngagementController],
  providers: [FavoritesService, FollowsService],
  exports: [FavoritesService, FollowsService],
})
export class EngagementModule {}
