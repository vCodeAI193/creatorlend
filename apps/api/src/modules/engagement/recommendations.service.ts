import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagesService } from './messages.service';

/** F-585/F-586/F-587: Werk-Empfehlungen (DM, öffentlich, Feed). */
@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
  ) {}

  /** F-586: Öffentliche Empfehlung erstellen oder aktualisieren. */
  async recommend(userId: string, workId: string, comment?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    return this.prisma.workRecommendation.create({
      data: { userId, workId, comment, isPublic: true },
      include: { work: { select: { id: true, title: true, type: true } } },
    });
  }

  /** F-585: Werk per DM an eine andere Person empfehlen. */
  async recommendViaDm(senderId: string, recipientId: string, workId: string, comment?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    const body = comment
      ? `Ich empfehle dir: "${work.title}" – ${comment}`
      : `Ich empfehle dir: "${work.title}"`;
    const dm = await this.messages.send(senderId, recipientId, body);
    await this.prisma.workRecommendation.create({
      data: { userId: senderId, workId, comment, isPublic: false },
    });
    return { dm, workId, title: work.title };
  }

  /** F-587: Empfehlungs-Feed (öffentliche Empfehlungen von gefolgten Künstler:innen). */
  async getFeed(userId: string, limit = 20) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { artistId: true },
    });
    const friendIds = following.map(f => f.artistId);
    if (friendIds.length === 0) {
      return this.prisma.workRecommendation.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
          work: { select: { id: true, title: true, type: true, artist: { select: { id: true, displayName: true } } } },
        },
      });
    }
    return this.prisma.workRecommendation.findMany({
      where: { isPublic: true, userId: { in: friendIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        work: { select: { id: true, title: true, type: true, artist: { select: { id: true, displayName: true } } } },
      },
    });
  }

  /** Empfehlungen eines Nutzers auflisten. */
  async listByUser(userId: string) {
    return this.prisma.workRecommendation.findMany({
      where: { userId, isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: { work: { select: { id: true, title: true, type: true } } },
    });
  }

  /** Empfehlung löschen. */
  async remove(userId: string, id: string) {
    await this.prisma.workRecommendation.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }
}
