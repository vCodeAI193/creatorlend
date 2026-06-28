import { Module } from "@nestjs/common";
import { PlaylistsController, PlaylistsPublicController } from "./playlists.controller";
import { PlaylistsService } from "./playlists.service";

@Module({
  controllers: [PlaylistsPublicController, PlaylistsController],
  providers: [PlaylistsService],
})
export class PlaylistsModule {}
