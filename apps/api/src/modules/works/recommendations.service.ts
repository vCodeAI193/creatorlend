import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonalizedFeed(userId: string, limit = 20) {
    const [following, recentLoans] = await Promise.all([
      this.prisma.follow.findMany({ where: { followerId: userId }, select: { artistId: true } }),
      this.prisma.loan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { workId: true, work: { select: { type: true } } },
      }),
    ]);
    const followedArtistIds = following.map((f) => f.artistId);
    const recentTypes = [...new Set(recentLoans.map((l) => l.work.type))];
    const borrowedWorkIds = recentLoans.map((l) => l.workId);

    const works = await this.prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        id: { notIn: borrowedWorkIds },
        OR: [
          ...(followedArtistIds.length > 0 ? [{ artistId: { in: followedArtistIds } }] : []),
          ...(recentTypes.length > 0 ? [{ type: { in: recentTypes as never[] } }] : []),
        ],
      },
      orderBy: { borrowCount: 'desc' },
      take: limit,
    });
    return works;
  }

  async getBecauseYouListened(userId: string, limit = 3) {
    const recentLoans = await this.prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { work: { select: { id: true, title: true, type: true, language: true, artistId: true } } },
    });
    const results = await Promise.all(
      recentLoans.map(async (loan) => {
        const recs = await this.prisma.work.findMany({
          where: {
            id: { not: loan.workId },
            status: 'PUBLISHED',
            type: loan.work.type,
            ...(loan.work.language ? { language: loan.work.language } : {}),
          },
          orderBy: { borrowCount: 'desc' },
          take: limit,
        });
        return { basedOn: { workId: loan.workId, title: loan.work.title }, recommendations: recs };
      }),
    );
    return results;
  }

  async getSimilarWorks(workId: string, limit = 10) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) return [];
    return this.prisma.work.findMany({
      where: {
        id: { not: workId },
        status: 'PUBLISHED',
        type: work.type,
        ...(work.language ? { language: work.language } : {}),
      },
      orderBy: { borrowCount: 'desc' },
      take: limit,
    });
  }

  async getNewArrivals(limit = 20) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.prisma.work.findMany({
      where: { status: 'PUBLISHED', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTrending(period: 'day' | 'week' | 'month' = 'week', limit = 20) {
    const msMap = { day: 86400000, week: 604800000, month: 2592000000 };
    const since = new Date(Date.now() - (msMap[period] ?? msMap.week));
    const rows = await this.prisma.$queryRaw<{ workId: string; cnt: bigint }[]>`
      SELECT "workId", COUNT(*) AS cnt
      FROM "Loan"
      WHERE "createdAt" >= ${since}
      GROUP BY "workId"
      ORDER BY cnt DESC
      LIMIT ${limit}
    `;
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.workId);
    const works = await this.prisma.work.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' } });
    const order = new Map(ids.map((id, i) => [id, i]));
    return works.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
}
