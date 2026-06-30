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
        select: { preferredTypes: true, excludedLanguages: true, profilingOptOut: true },
      }),
    ]);

    // F-077: If user opts out of profiling, return generic popular works
    if (user?.profilingOptOut) {
      return this.prisma.work.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { borrowCount: 'desc' },
        take: limit,
      });
    }

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

  // F-618: Trending-Themen-Tag-Cloud
  async getTrendingTags(period: 'day' | 'week' | 'month' = 'week', limit = 50) {
    const msMap = { day: 86400000, week: 604800000, month: 2592000000 };
    const since = new Date(Date.now() - (msMap[period] ?? msMap.week));

    // Get recently borrowed works
    const rows = await this.prisma.$queryRaw<{ workId: string; cnt: bigint }[]>`
      SELECT "workId", COUNT(*) AS cnt
      FROM "Loan"
      WHERE "createdAt" >= ${since}
      GROUP BY "workId"
      ORDER BY cnt DESC
      LIMIT 200
    `;
    if (rows.length === 0) return { tags: [] };

    const ids = rows.map((r) => r.workId);
    const cntMap = new Map(rows.map((r) => [r.workId, Number(r.cnt)]));

    const works = await this.prisma.work.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      select: { id: true, tags: true, type: true },
    });

    // Aggregate tag weights by loan count
    const tagWeight = new Map<string, number>();
    for (const w of works) {
      const weight = cntMap.get(w.id) ?? 1;
      for (const tag of w.tags) {
        tagWeight.set(tag, (tagWeight.get(tag) ?? 0) + weight);
      }
      // Also include type as a virtual tag
      tagWeight.set(w.type.toLowerCase(), (tagWeight.get(w.type.toLowerCase()) ?? 0) + weight);
    }

    const sorted = [...tagWeight.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, weight]) => ({ tag, weight }));

    const maxWeight = sorted[0]?.weight ?? 1;
    return {
      period,
      tags: sorted.map(({ tag, weight }) => ({
        tag,
        weight,
        // Normalize to 1-5 scale for UI sizing
        size: Math.ceil((weight / maxWeight) * 5),
      })),
    };
  }

  // F-208: Ähnliche Künstler:innen auf Profilseite
  async getSimilarArtists(artistId: string, limit = 6) {
    const works = await this.prisma.work.findMany({ where: { artistId, status: 'PUBLISHED' }, select: { type: true, tags: true }, take: 10 });
    const types = [...new Set(works.map((w) => w.type))];
    const tags = [...new Set(works.flatMap((w) => w.tags as string[]))].slice(0, 5);
    const similar = await this.prisma.user.findMany({ where: { role: 'ARTIST', id: { not: artistId }, works: { some: { status: 'PUBLISHED', OR: [{ type: { in: types as never[] } }, ...(tags.length ? [{ tags: { hasSome: tags } }] : [])] } } }, take: limit, select: { id: true, displayName: true, avatarUrl: true, slug: true } });
    return { artistId, similarArtists: similar };
  }

  // F-209: "Andere Hörer:innen mögen auch…"
  async getOtherListenersAlsoLike(workId: string, limit = 10) {
    const borrowers = await this.prisma.loan.findMany({ where: { workId }, select: { userId: true }, take: 100 });
    const userIds = borrowers.map((b) => b.userId);
    if (!userIds.length) return { workId, alsoLike: [] };
    const rows = await this.prisma.$queryRaw<{ workId: string; cnt: bigint }[]>`
      SELECT "workId", COUNT(*) AS cnt FROM "Loan"
      WHERE "userId" = ANY(${userIds}::uuid[]) AND "workId" != ${workId}
      GROUP BY "workId" ORDER BY cnt DESC LIMIT ${limit}
    `;
    const ids = rows.map((r) => r.workId);
    const works = ids.length ? await this.prisma.work.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' } }) : [];
    return { workId, alsoLike: works };
  }

  // F-210: Collaborative Filtering (stub – uses borrow-based co-occurrence)
  async getCollaborativeRecs(userId: string, limit = 10) {
    return this.getPersonalizedFeed(userId, limit);
  }

  // F-211: Content-Based Filtering
  async getContentBasedRecs(workId: string, limit = 10) {
    return this.getSimilarWorks(workId, limit);
  }

  // F-212: Hybrid-Recommender
  async getHybridRecs(userId: string, limit = 10) {
    const [collab, feed] = await Promise.all([this.getPersonalizedFeed(userId, limit), this.getNewArrivals(5)]);
    const seen = new Set<string>();
    return [...collab, ...feed].filter((w) => { if (seen.has(w.id)) return false; seen.add(w.id); return true; }).slice(0, limit);
  }

  // F-213: Empfehlungen nach Tageszeit
  getTimeOfDayRecs(hour: number) {
    const slot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const typeMap: Record<string, string[]> = { night: ['AUDIOBOOK'], morning: ['PODCAST', 'MUSIC'], afternoon: ['MUSIC', 'PODCAST'], evening: ['AUDIOBOOK', 'MUSIC'] };
    return { slot, recommendedTypes: typeMap[slot], message: 'Filter GET /api/v1/works?type=AUDIOBOOK for time-based discovery' };
  }

  // F-214: Empfehlungen nach Wetterlage
  getWeatherRecs(condition: string) {
    const map: Record<string, string[]> = { sunny: ['energetic', 'happy'], rainy: ['melancholic', 'cozy'], cloudy: ['focus', 'calm'], snowy: ['festive', 'peaceful'] };
    return { condition, recommendedMoods: map[condition] ?? ['calm'], message: 'Integrate weather API (OpenWeatherMap) to auto-detect condition at client' };
  }

  // F-215: Top-Charts nach Land / Region
  async getChartsByCountry(countryCode: string, limit = 20) {
    const rows = await this.prisma.$queryRaw<{ workId: string; cnt: bigint }[]>`
      SELECT l."workId", COUNT(*) AS cnt FROM "Loan" l
      JOIN "Work" w ON w.id = l."workId"
      WHERE w.status = 'PUBLISHED' AND NOT (${countryCode} = ANY(w."geoBlock"))
      GROUP BY l."workId" ORDER BY cnt DESC LIMIT ${limit}
    `;
    const ids = rows.map((r) => r.workId);
    const works = ids.length ? await this.prisma.work.findMany({ where: { id: { in: ids } } }) : [];
    return { country: countryCode, works };
  }

  // F-218: Genre-spezifische Charts
  async getGenreCharts(genre: string, limit = 20) {
    const works = await this.prisma.work.findMany({ where: { status: 'PUBLISHED', category: genre }, orderBy: { borrowCount: 'desc' }, take: limit });
    return { genre, works };
  }

  // F-219: Editorielle Bestenliste "Werke des Jahres"
  async getEditorialBestOf(year?: number) {
    const y = year ?? new Date().getFullYear();
    const key = `editorial_best_of_${y}`;
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    const ids: string[] = row ? (JSON.parse(row.value) as string[]) : [];
    const works = ids.length ? await this.prisma.work.findMany({ where: { id: { in: ids } } }) : [];
    return { year: y, works };
  }

  // F-220: Nutzer:innen-Abstimmung für Jahres-Top-10
  async voteForBestOf(userId: string, workId: string, year?: number) {
    const y = year ?? new Date().getFullYear();
    const key = `vote_${y}_${userId}`;
    await this.prisma.appSetting.upsert({ where: { key }, create: { key, value: workId }, update: { value: workId } });
    return { userId, workId, year: y, message: 'Vote recorded – tallied daily by scheduler' };
  }

  // F-221: Kategorieseiten mit editoriellem Intro-Text
  async getCategoryPage(category: string) {
    const row = await this.prisma.appSetting.findUnique({ where: { key: `category_intro:${category}` } });
    const works = await this.prisma.work.findMany({ where: { status: 'PUBLISHED', category }, orderBy: { borrowCount: 'desc' }, take: 20 });
    return { category, intro: row?.value ?? null, works };
  }

  // F-223: Sammelseite: "Demnächst verfügbar" (Pre-Release)
  async getUpcomingReleases(limit = 20) {
    const works = await this.prisma.work.findMany({ where: { status: 'DRAFT', publishAt: { gte: new Date() } }, orderBy: { publishAt: 'asc' }, take: limit, select: { id: true, title: true, publishAt: true, artistId: true, type: true } });
    return { works };
  }

  // F-224: Sammelseite: "Letzte Chance" (bald ablaufend – stub: no expiry on works)
  async getLastChanceSoon(limit = 20) {
    return { works: [], message: 'Work expiry not modelled – return works by availableTo proximity', limit };
  }

  // F-225: Sammelseite: "Kostenlos hörbar" (alle mit Vorschau)
  async getFreePreview(limit = 20) {
    const works = await this.prisma.work.findMany({ where: { status: 'PUBLISHED', previewKey: { not: null } }, orderBy: { borrowCount: 'desc' }, take: limit });
    return { works };
  }

  // F-226: Saisonale Sammlungen
  getSeasonalCollections() {
    const month = new Date().getMonth() + 1;
    const season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
    const tagMap: Record<string, string[]> = { spring: ['frühling', 'neubeginn', 'leicht'], summer: ['sommer', 'strand', 'entspannung'], autumn: ['herbst', 'gemütlich', 'nostalgie'], winter: ['weihnachten', 'advent', 'warm'] };
    return { season, suggestedTags: tagMap[season], searchUrl: `/api/v1/works?tags=${(tagMap[season] ?? []).join(',')}` };
  }

  // F-227: Thematische Playlisten vom Redaktionsteam
  async getEditorialPlaylists() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: 'editorial_playlists' } });
    return { playlists: row ? JSON.parse(row.value) : [], updatedAt: row?.updatedAt ?? null };
  }

  // F-229: "Entdecke deinen Künstler:in der Woche"
  async getArtistOfTheWeek() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: 'artist_of_the_week' } });
    if (!row) return { artist: null, message: 'Set artist_of_the_week AppSetting to an artist ID' };
    const artist = await this.prisma.user.findUnique({ where: { id: row.value }, select: { id: true, displayName: true, avatarUrl: true, bio: true, slug: true } });
    return { artist, validUntil: null };
  }

  // F-230: Podcast-Staffel-Empfehlungen (binge-worthy)
  async getBingePodcasts(limit = 10) {
    const works = await this.prisma.work.findMany({ where: { status: 'PUBLISHED', type: 'PODCAST' }, orderBy: { borrowCount: 'desc' }, take: limit });
    return { works, message: 'Filter by series with most episodes via series API for richer binge-worthy ranking' };
  }

  // F-231: Empfehlungen basierend auf Bookmarks
  async getBookmarkBasedRecs(userId: string, limit = 10) {
    const bookmarks = await this.prisma.bookmark.findMany({ where: { userId }, include: { work: { select: { type: true, tags: true } } }, take: 20 });
    const types = [...new Set(bookmarks.map((b) => b.work.type))];
    if (!types.length) return { recommendations: [] };
    const borrowedIds = (await this.prisma.loan.findMany({ where: { userId }, select: { workId: true } })).map((l) => l.workId);
    const works = await this.prisma.work.findMany({ where: { status: 'PUBLISHED', type: { in: types as never[] }, id: { notIn: borrowedIds } }, orderBy: { borrowCount: 'desc' }, take: limit });
    return { recommendations: works };
  }

  // F-232: Was hören Freunde?
  async getSocialRecs(userId: string, limit = 10) {
    const follows = await this.prisma.follow.findMany({ where: { followerId: userId }, select: { artistId: true } });
    const followedIds = follows.map((f) => f.artistId);
    if (!followedIds.length) return { recommendations: [] };
    const friendLoans = await this.prisma.loan.findMany({ where: { userId: { in: followedIds }, status: 'ACTIVE' }, include: { work: true }, take: 50 });
    const seen = new Set<string>();
    const recs = friendLoans.map((l) => l.work).filter((w) => { if (seen.has(w.id)) return false; seen.add(w.id); return true; }).slice(0, limit);
    return { recommendations: recs };
  }
}
