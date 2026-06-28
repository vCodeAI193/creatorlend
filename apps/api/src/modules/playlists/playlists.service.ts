import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface CreatePlaylistInput {
  title: string;
  description?: string;
  isPublic?: boolean;
}

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreatePlaylistInput) {
    return this.prisma.playlist.create({
      data: { userId, title: input.title, description: input.description, isPublic: input.isPublic ?? true },
      include: { items: true },
    });
  }

  list(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: { items: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPublic(playlistId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { items: { orderBy: { position: "asc" }, include: { work: true } } },
    });
    if (!playlist) throw new NotFoundException("playlist_not_found");
    if (!playlist.isPublic) throw new ForbiddenException("playlist_is_private");
    return playlist;
  }

  private async ownedPlaylist(userId: string, playlistId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException("playlist_not_found");
    if (playlist.userId !== userId) throw new ForbiddenException("not_owner");
    return playlist;
  }

  async addItem(userId: string, playlistId: string, workId: string, position?: number) {
    await this.ownedPlaylist(userId, playlistId);
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    return this.prisma.playlistItem.create({
      data: { playlistId, workId, position: position ?? 0 },
    });
  }

  async removeItem(userId: string, playlistId: string, workId: string) {
    await this.ownedPlaylist(userId, playlistId);
    await this.prisma.playlistItem.deleteMany({ where: { playlistId, workId } });
    return { removed: true };
  }

  async delete(userId: string, playlistId: string) {
    await this.ownedPlaylist(userId, playlistId);
    await this.prisma.playlist.delete({ where: { id: playlistId } });
    return { deleted: true };
  }
}
