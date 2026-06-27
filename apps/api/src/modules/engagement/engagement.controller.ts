import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { FavoritesService } from "./favorites.service";
import { FollowsService } from "./follows.service";
import { FavoriteDto } from "./dto/favorite.dto";
import { FollowDto } from "./dto/follow.dto";

/** Merkliste & Folgen (Hörer:innen). */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class EngagementController {
  constructor(
    private readonly favorites: FavoritesService,
    private readonly follows: FollowsService,
  ) {}

  // POST /api/v1/favorites
  @Post("favorites")
  addFavorite(@CurrentUser() userId: string, @Body() body: FavoriteDto) {
    return this.favorites.add(userId, body.workId);
  }

  // DELETE /api/v1/favorites/:workId
  @Delete("favorites/:workId")
  removeFavorite(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.favorites.remove(userId, workId);
  }

  // GET /api/v1/favorites
  @Get("favorites")
  listFavorites(@CurrentUser() userId: string) {
    return this.favorites.list(userId);
  }

  // POST /api/v1/follows
  @Post("follows")
  follow(@CurrentUser() userId: string, @Body() body: FollowDto) {
    return this.follows.follow(userId, body.artistId);
  }

  // DELETE /api/v1/follows/:artistId
  @Delete("follows/:artistId")
  unfollow(@CurrentUser() userId: string, @Param("artistId") artistId: string) {
    return this.follows.unfollow(userId, artistId);
  }

  // GET /api/v1/follows
  @Get("follows")
  listFollows(@CurrentUser() userId: string) {
    return this.follows.list(userId);
  }
}
