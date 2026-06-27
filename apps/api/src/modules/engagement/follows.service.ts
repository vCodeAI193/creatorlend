import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, artistId: string) {
    if (followerId === artistId) {
      throw new BadRequestException("cannot_follow_self");
    }
    const artist = await this.prisma.user.findUnique({ where: { id: artistId } });
    if (!artist || artist.role !== "ARTIST") {
      throw new NotFoundException("artist_not_found");
    }
    try {
      return await this.prisma.follow.create({ data: { followerId, artistId } });
    } catch {
      throw new ConflictException("already_following");
    }
  }

  async unfollow(followerId: string, artistId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, artistId } });
    return { unfollowed: true };
  }

  async list(followerId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId },
      orderBy: { createdAt: "desc" },
      include: {
        artist: { select: { id: true, displayName: true, role: true } },
      },
    });
    return follows.map((f) => f.artist);
  }
}
