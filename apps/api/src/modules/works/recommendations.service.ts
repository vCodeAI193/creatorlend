import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonalizedFeed(userId: string, limit = 20) {
    const [following, recentLoans, user] = await Promise.all([
      this.prisma.follow.findMany({ where: { followerId: userId }, select: { artistId: true } }),
      this.prisma.loan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { workId: true, work: { select: { type: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferredTypes: true, excludedLanguages: true },
      }),
    ]);
    const followedArtistIds = following.map((f) => f.artistId);
    const recentTypes = [...new Set(recentLoans.map((l) => l.work.type))];
    const borrowedWorkIds = recentLoans.map((l) => l.workId);

    // F-073/F-074: apply user content preferences
    const preferredTypes = user?.preferredTypes ?? [];
    const excludedLanguages = user?.excludedLanguages ?? [];
    const typeFilter = preferredTypes.length > 0
      ? preferredTypes
      : recentTypes;

    const works = await this.prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        id: { notIn: borrowedWorkIds },
        ...(excludedLanguages.length > 0
          ? { language: { notIn: excludedLanguages } }
          : {}),
        OR: [
          ...(followedArtistIds.length > 0 ? [{ artistId: { in: followedArtistIds } }] : []),
          ...(typeFilter.length > 0 ? [{ type: { in: typeFilter as never[] } }] : []),
          ...(followedArtistIds.length === 0 && typeFilter.length === 0
            ? [{ status: 'PUBLISHED' as const }] : []),
        ],
      },
      orderBy: { borrowCount: 'desc' },
      take: limit,
    });
    return works;
  }

  /**
   * F-228: Daily Mix – tägliche deterministische Playlist.
   */
  async getDailyMix(userId: string) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [following, recentLoans] = await Promise.all([
      this.prisma.follow.findMany({ where: { followerId: userId }, select: { artistId: true } }),
      this.prisma.loan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { workId: true, work: { select: { type: true, artistId: true } } },
      }),
    ]);

    const borrowedWorkIds = new Set(recentLoans.map((l) => l.workId));
    const followedArtistIds = following.map((f) => f.artistId);
    const recentTypes = [...new Set(recentLoans.map((l) => l.work.type))];

    // Build pool of candidates
    const [fromFollowed, byType, discovery] = await Promise.all([
      // Works from followed artists
      followedArtistIds.length > 0
        ? this.prisma.work.findMany({
            where: { status: 'PUBLISHED', artistId: { in: followedArtistIds }, id: { notIn: [...borrowedWorkIds] } },
            orderBy: { borrowCount: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      // Works by preferred type
      recentTypes.length > 0
        ? this.prisma.work.findMany({
            where: { status: 'PUBLISHED', type: { in: recentTypes as never[] }, id: { notIn: [...borrowedWorkIds] } },
            orderBy: { borrowCount: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      // Discovery works (new arrivals)
      this.prisma.work.findMany({
        where: { status: 'PUBLISHED', id: { notIn: [...borrowedWorkIds] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Deterministic shuffle using date as seed
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const seededRandom = (n: number) => {
      let x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };

    const seen = new Set<string>();
    const pool = [...fromFollowed, ...byType, ...discovery].filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });

    const shuffled = pool
      .map((w, i) => ({ w, r: seededRandom(i) }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.w)
      .slice(0, 20);

    return { date: dateStr, works: shuffled };
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
