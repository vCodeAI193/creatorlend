import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { NotificationType } from "../notifications/notification-types";

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async follow(followerId: string, artistId: string) {
    if (followerId === artistId) {
      throw new BadRequestException("cannot_follow_self");
    }
    const artist = await this.prisma.user.findUnique({ where: { id: artistId } });
    if (!artist || artist.role !== "ARTIST") {
      throw new NotFoundException("artist_not_found");
    }
    try {
      const follow = await this.prisma.follow.create({ data: { followerId, artistId } });
      // F-610: Notify artist of new follower
      await this.prisma.notification.create({
        data: {
          userId: artistId,
          type: NotificationType.NEW_FOLLOWER,
          title: 'Neuer Follower',
          body: 'Jemand folgt dir jetzt.',
          data: { followerId },
        },
      }).catch(() => { /* non-critical */ });
      return follow;
    } catch (err: unknown) {
      if (err instanceof ConflictException) throw err;
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') throw new ConflictException("already_following");
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

  /**
   * Aktivitäts-Feed gefolgter Künstler:innen (B-032): neueste veröffentlichte
   * Werke von Künstler:innen, denen der:die Nutzer:in folgt.
   */
  async activityFeed(followerId: string, limit = 30) {
    const following = await this.prisma.follow.findMany({
      where: { followerId },
      select: { artistId: true },
    });
    if (following.length === 0) return [];
    const artistIds = following.map((f) => f.artistId);
    return this.prisma.work.findMany({
      where: { artistId: { in: artistIds }, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        type: true,
        loanPriceCents: true,
        updatedAt: true,
        artist: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  /**
   * Follower-Wachstum gruppiert nach Monat (F-273).
   * Gibt den letzten Jahres-Verlauf zurück.
   */
  async followerGrowth(artistId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { artistId },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const byMonth: Record<string, number> = {};
    for (const f of follows) {
      const key = `${f.createdAt.getFullYear()}-${String(f.createdAt.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    return { artistId, total: follows.length, byMonth };
  }

  /**
   * Newsletter an alle Follower:innen senden (F-274).
   * Sendet via MailService an alle Follower, die der Künstler:in folgen.
   */
  async sendNewsletterToFollowers(artistId: string, subject: string, body: string) {
    const follows = await this.prisma.follow.findMany({
      where: { artistId },
      include: { follower: { select: { email: true } } },
    });
    const emails = follows.map((f) => f.follower.email);
    for (const email of emails) {
      this.mail.sendEmail(email, subject, body).catch(() => { /* ignore errors */ });
    }
    return { recipients: emails.length, subject, mode: "queued" };
  }
}
