import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { PlaylistsService } from "./playlists.service";

// Public endpoint – no auth needed
@Controller("playlists")
export class PlaylistsPublicController {
  constructor(private readonly playlists: PlaylistsService) {}

  // GET /api/v1/playlists/:id – öffentliche Playlist abrufen
  @Get(":id")
  getPublic(@Param("id") id: string) {
    return this.playlists.getPublic(id);
  }
}

@Controller("playlists")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER, UserRole.ARTIST)
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  // POST /api/v1/playlists – Playlist erstellen
  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() body: { title: string; description?: string; isPublic?: boolean },
  ) {
    return this.playlists.create(userId, body);
  }

  // GET /api/v1/playlists/me – eigene Playlists
  @Get("me")
  list(@CurrentUser() userId: string) {
    return this.playlists.list(userId);
  }

  // POST /api/v1/playlists/:id/items – Werk zur Playlist hinzufügen
  @Post(":id/items")
  addItem(
    @CurrentUser() userId: string,
    @Param("id") playlistId: string,
    @Body("workId") workId: string,
    @Body("position") position?: number,
  ) {
    return this.playlists.addItem(userId, playlistId, workId, position);
  }

  // DELETE /api/v1/playlists/:id/items/:workId – Werk entfernen
  @Delete(":id/items/:workId")
  removeItem(
    @CurrentUser() userId: string,
    @Param("id") playlistId: string,
    @Param("workId") workId: string,
  ) {
    return this.playlists.removeItem(userId, playlistId, workId);
  }

  // DELETE /api/v1/playlists/:id – Playlist löschen
  @Delete(":id")
  delete(@CurrentUser() userId: string, @Param("id") playlistId: string) {
    return this.playlists.delete(userId, playlistId);
  }
}
