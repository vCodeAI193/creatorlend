import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";

// F-329: Price floor/ceiling
export const MIN_PRICE = 50;   // 50 cents minimum
export const MAX_PRICE = 9999; // $99.99 maximum

interface CreateWorkInput {
  title: string;
  type: string;
  description?: string;
  loanPriceCents: number;
  loanDays?: number; // Konfigurierbare Leihdauer (B-077)
  durationSeconds?: number;
  language?: string;
  category?: string;
  tags?: string[];
  explicit?: boolean;
  publishAt?: string; // ISO-Datetime für geplante Veröffentlichung (B-040)
  earlyAccessDays?: number; // Früher Zugang nur für PREMIUM (F-165/F-166)
  coAuthorIds?: string[]; // Mitautoren (F-472)
}

export interface SearchFilter {
  type?: string;
  q?: string;
  language?: string;
  category?: string;
  sort?: string; // "new" | "popular" | "price_asc" | "price_desc" | "duration_asc" | "duration_desc"
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  explicit?: boolean; // true = include explicit; false = exclude
  tags?: string[]; // filter by any of these tags
  userId?: string; // for kidsMode filtering and search history
  followedOnly?: boolean; // F-195: nur Werke von gefolgten Künstler:innen
}

@Injectable()
export class WorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Legt ein Werk im Status DRAFT an. Der eigentliche Datei-Upload erfolgt
   * über eine signierte Upload-URL (MediaService).
   */
  async create(artistId: string, input: CreateWorkInput) {
    // F-329: Price floor/ceiling enforcement
    if (input.loanPriceCents < MIN_PRICE) {
      throw new BadRequestException(`price_below_minimum:${MIN_PRICE}`);
    }
    if (input.loanPriceCents > MAX_PRICE) {
      throw new BadRequestException(`price_above_maximum:${MAX_PRICE}`);
    }

    const work = await this.prisma.work.create({
      data: {
        artistId,
        title: input.title,
        type: input.type as never,
        description: input.description,
        loanPriceCents: input.loanPriceCents,
        loanDays: input.loanDays ?? 7,
        durationSeconds: input.durationSeconds,
        language: input.language,
        category: input.category,
        tags: input.tags ?? [],
        explicit: input.explicit ?? false,
        publishAt: input.publishAt ? new Date(input.publishAt) : null,
        earlyAccessDays: input.earlyAccessDays ?? 0,
        coAuthorIds: input.coAuthorIds ?? [],
        status: "DRAFT",
      },
    });

    return {
      ...work,
      upload: this.media.getUploadUrl(work.id),
    };
  }

  private async ownedWork(artistId: string, id: string) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
    if (work.artistId !== artistId) throw new ForbiddenException("not_owner");
    return work;
  }

  async update(artistId: string, id: string, input: Partial<CreateWorkInput>) {
    await this.ownedWork(artistId, id);

    // F-329: Price floor/ceiling enforcement when price is being updated
    if (input.loanPriceCents !== undefined) {
      if (input.loanPriceCents < MIN_PRICE) {
        throw new BadRequestException(`price_below_minimum:${MIN_PRICE}`);
      }
      if (input.loanPriceCents > MAX_PRICE) {
        throw new BadRequestException(`price_above_maximum:${MAX_PRICE}`);
      }
    }

    return this.prisma.work.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        loanPriceCents: input.loanPriceCents,
        durationSeconds: input.durationSeconds,
        language: input.language,
        category: input.category,
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.explicit !== undefined ? { explicit: input.explicit } : {}),
        ...(input.publishAt !== undefined ? { publishAt: input.publishAt ? new Date(input.publishAt) : null } : {}),
        ...(input.type ? { type: input.type as never } : {}),
        ...(input.coAuthorIds !== undefined ? { coAuthorIds: input.coAuthorIds } : {}),
      },
    });
  }

  async updateAccessibility(artistId: string, workId: string, data: { hasTranscript?: boolean; hasAudioDescription?: boolean; hasCaptions?: boolean }) {
    await this.ownedWork(artistId, workId);
    return this.prisma.work.update({ where: { id: workId }, data });
  }

  async publish(artistId: string, id: string, earlyAccessDays?: number) {
    const work = await this.ownedWork(artistId, id);
    const updated = await this.prisma.work.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        ...(earlyAccessDays !== undefined ? { earlyAccessDays } : {}),
      },
    });

    // Follower:innen der Künstler:in benachrichtigen (F-246/B-126)
    const artist = await this.prisma.user.findUnique({
      where: { id: artistId },
      select: { displayName: true },
    });
    const followers = await this.prisma.follow.findMany({
      where: { artistId },
      select: { followerId: true },
    });
    if (followers.length > 0) {
      await this.notifications.createMany(
        followers.map((f) => ({
          userId: f.followerId,
          type: NotificationType.NEW_WORK,
          title: "Neues Werk verfügbar",
          body: `${artist?.displayName ?? "Ein Künstler"} hat ein neues Werk veröffentlicht: „${work.title}"`,
          data: { workId: id, artistId },
        })),
      );
    }

    return updated;
  }

  /** F-165/F-166: Werk mit Early-Access-Zeitraum veröffentlichen. */
  async publishWithEarlyAccess(artistId: string, id: string, earlyAccessDays: number) {
    return this.publish(artistId, id, earlyAccessDays);
  }

  /** Werk depublizieren / archivieren (B-041). Aktive Leihen laufen aus. */
  async unpublish(artistId: string, id: string) {
    await this.ownedWork(artistId, id);
    return this.prisma.work.update({
      where: { id },
      data: { status: "DRAFT" },
    });
  }

  /**
   * Discovery: Filter nach Typ/Sprache/Kategorie + Volltext über Titel und
   * Beschreibung (B-059), Sortierung nach "new" (Standard) oder "popular".
   * F-042: kidsMode-Filterung wenn userId übergeben.
   */
  async search(filter: SearchFilter) {
    const now = new Date();

    // Check kidsMode if userId provided
    let kidsMode = false;
    if (filter.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: filter.userId },
        select: { kidsModeEnabled: true },
      });
      kidsMode = user?.kidsModeEnabled ?? false;

      // Save search history (fire and forget)
      if (filter.q) {
        this.prisma.searchHistory.create({
          data: { userId: filter.userId, query: filter.q },
        }).catch(() => {});
      }
    }

    // F-195: Filter by followed artists only
    let followedArtistIds: string[] | undefined;
    if (filter.followedOnly && filter.userId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: filter.userId },
        select: { artistId: true },
      });
      followedArtistIds = follows.map((f: { artistId: string }) => f.artistId);
    }

    const where: Prisma.WorkWhereInput = {
      status: "PUBLISHED",
      // F-113: Embargo-Filter – nur Werke ohne oder mit abgelaufenem Embargo
      OR: [{ embargoUntil: null }, { embargoUntil: { lte: now } }],
      ...(followedArtistIds ? { artistId: { in: followedArtistIds } } : {}),
      ...(filter.type ? { type: filter.type as never } : {}),
      ...(filter.language ? { language: filter.language } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      // Explicit-Content-Filter (B-038): explicit=false schließt explizite Werke aus
      ...(filter.explicit === false ? { explicit: false } : {}),
      // F-042: kidsMode filtert altersbeschränkte Inhalte heraus
      ...(kidsMode ? { ageRating: { notIn: ["FSK_12", "FSK_16", "FSK_18"] } } : {}),
      // Preis-Facette (B-061)
      ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
        ? {
            loanPriceCents: {
              ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
              ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
            },
          }
        : {}),
      // Dauer-Facette (B-061)
      ...(filter.minDuration !== undefined || filter.maxDuration !== undefined
        ? {
            durationSeconds: {
              ...(filter.minDuration !== undefined ? { gte: filter.minDuration } : {}),
              ...(filter.maxDuration !== undefined ? { lte: filter.maxDuration } : {}),
            },
          }
        : {}),
      // Tag-Filter (B-036): Werk muss mindestens einen der gesuchten Tags enthalten
      ...(filter.tags && filter.tags.length > 0
        ? { tags: { hasSome: filter.tags } }
        : {}),
      ...(filter.q
        ? {
            OR: [
              { title: { contains: filter.q, mode: "insensitive" } },
              { description: { contains: filter.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    let orderBy: Prisma.WorkOrderByWithRelationInput;
    switch (filter.sort) {
      case "popular":
        orderBy = { borrowCount: "desc" };
        break;
      case "price_asc":
        orderBy = { loanPriceCents: "asc" };
        break;
      case "price_desc":
        orderBy = { loanPriceCents: "desc" };
        break;
      case "duration_asc":
        orderBy = { durationSeconds: "asc" };
        break;
      case "duration_desc":
        orderBy = { durationSeconds: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    return this.prisma.work.findMany({ where, orderBy, take: 100 });
  }

  /**
   * Trending-Werke (B-063): die 20 meistgeliehenen Werke der letzten 7 Tage.
   * Nutzt einen Raw-Query auf die Loan-Tabelle für Aktualität.
   */
  async trending(limit = 20) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
    const works = await this.prisma.work.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
    });
    // Reihenfolge gemäß Trending-Rang beibehalten
    const order = new Map(ids.map((id, i) => [id, i]));
    return works.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  /**
   * Ähnliche Werke (B-065): selber Typ + Kategorie, höchste Ausleihen,
   * außer dem angegebenen Werk selbst.
   */
  async similar(id: string, limit = 8) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
    return this.prisma.work.findMany({
      where: {
        id: { not: id },
        status: "PUBLISHED",
        type: work.type,
        ...(work.category ? { category: work.category } : {}),
      },
      orderBy: { borrowCount: "desc" },
      take: limit,
    });
  }

  async get(id: string, userId?: string) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
    // F-113: Embargo check – treat embargoed work as not published
    if (work.embargoUntil && work.embargoUntil > new Date()) {
      throw new NotFoundException("work_not_found");
    }
    // F-165/F-166: Early access check
    if (work.earlyAccessDays > 0 && work.status === "PUBLISHED") {
      const earlyAccessEnd = new Date(work.createdAt.getTime() + work.earlyAccessDays * 24 * 60 * 60 * 1000);
      if (new Date() < earlyAccessEnd && userId) {
        const subscription = await this.prisma.subscription.findUnique({
          where: { userId },
          select: { plan: true, status: true },
        });
        if (!subscription || subscription.status !== "ACTIVE" || subscription.plan !== "PREMIUM") {
          throw new ForbiddenException("early_access_premium_only");
        }
      }
    }
    // F-458: Increment viewCount in background (fire-and-forget)
    this.prisma.work.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    // F-455: Return effective price (promoPrice if promo is active)
    const effectivePrice =
      work.promoEndsAt && work.promoEndsAt > new Date() && work.promoPrice != null
        ? work.promoPrice
        : work.loanPriceCents;

    return { ...work, effectivePriceCents: effectivePrice };
  }

  // ─── Episodes (B-033) ─────────────────────────────────────────────────────

  async addEpisode(
    artistId: string,
    workId: string,
    input: { title: string; number: number; description?: string; durationSeconds?: number },
  ) {
    await this.ownedWork(artistId, workId);
    return this.prisma.episode.create({
      data: { workId, ...input },
    });
  }

  async listEpisodes(workId: string) {
    return this.prisma.episode.findMany({
      where: { workId },
      orderBy: { number: "asc" },
    });
  }

  async deleteEpisode(artistId: string, workId: string, episodeId: string) {
    await this.ownedWork(artistId, workId);
    await this.prisma.episode.deleteMany({ where: { id: episodeId, workId } });
    return { deleted: true };
  }

  // ─── Preview URL (B-043) ──────────────────────────────────────────────────

  /** Liefert eine zeitlich begrenzte Vorschau-URL für das Werk (kostenlos). */
  getPreviewUrl(work: { id: string; previewKey: string | null }) {
    if (!work.previewKey) return null;
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 Minuten
    return this.media.getStreamUrl(work.previewKey, expires);
  }

  async getWithPreview(id: string) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
    return { ...work, preview: this.getPreviewUrl(work) };
  }

  // F-097: Work archiving (remove from catalog without deletion)
  async archive(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    return this.prisma.work.update({ where: { id: workId }, data: { archivedAt: new Date(), status: 'DRAFT' } });
  }

  async restoreFromArchive(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    return this.prisma.work.update({ where: { id: workId }, data: { archivedAt: null } });
  }

  /** @deprecated use restoreFromArchive */
  async restore(artistId: string, workId: string) {
    return this.restoreFromArchive(artistId, workId);
  }

  // F-099: Clone work (basis for a similar new work)
  async clone(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    const { id, createdAt, updatedAt, borrowCount, publishAt, archivedAt, deletedAt, revenueShares, ...rest } = work;
    return this.prisma.work.create({
      data: {
        ...rest,
        title: `${work.title} (Kopie)`,
        status: 'DRAFT',
        borrowCount: 0,
        ...(revenueShares !== null ? { revenueShares: revenueShares as never } : {}),
      },
    });
  }

  /** Soft-delete a work (F-098). */
  async softDelete(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    return this.prisma.work.update({ where: { id: workId }, data: { deletedAt: new Date(), status: 'DRAFT' } });
  }

  /** Restore a soft-deleted work within 30 days (F-098). */
  async restoreDeleted(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    if (!work.deletedAt) throw new NotFoundException('work_not_deleted');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (work.deletedAt < thirtyDaysAgo) {
      throw new NotFoundException('restore_window_expired');
    }
    return this.prisma.work.update({ where: { id: workId }, data: { deletedAt: null } });
  }

  /** Update metadata fields (F-111..F-116). */
  async updateMetadata(
    artistId: string,
    workId: string,
    fields: {
      licenseType?: string;
      embargoUntil?: string | null;
      geoBlock?: string[];
      ageRating?: string;
      contentWarnings?: string[];
      isExclusive?: boolean;
      isbn?: string;
      isrc?: string;
    },
  ) {
    await this.ownedWork(artistId, workId);
    return this.prisma.work.update({
      where: { id: workId },
      data: {
        ...(fields.licenseType !== undefined ? { licenseType: fields.licenseType } : {}),
        ...(fields.embargoUntil !== undefined
          ? { embargoUntil: fields.embargoUntil ? new Date(fields.embargoUntil) : null }
          : {}),
        ...(fields.geoBlock !== undefined ? { geoBlock: fields.geoBlock } : {}),
        ...(fields.ageRating !== undefined ? { ageRating: fields.ageRating } : {}),
        ...(fields.contentWarnings !== undefined ? { contentWarnings: fields.contentWarnings } : {}),
        ...(fields.isExclusive !== undefined ? { isExclusive: fields.isExclusive } : {}),
        ...(fields.isbn !== undefined ? { isbn: fields.isbn } : {}),
        ...(fields.isrc !== undefined ? { isrc: fields.isrc } : {}),
      },
    });
  }

  /** RSS 2.0 feed for an artist's published works (F-137). */
  async getRssFeed(artistId: string): Promise<string> {
    const artist = await this.prisma.user.findUnique({
      where: { id: artistId },
      select: { displayName: true },
    });
    const works = await this.prisma.work.findMany({
      where: { artistId, status: 'PUBLISHED', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        mediaKey: true,
      },
    });

    const escapeXml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

    const items = works
      .map((w) => {
        const enclosure = w.mediaKey
          ? `<enclosure url="${escapeXml(`${appUrl}/media/${w.mediaKey}`)}" type="audio/mpeg" />`
          : '';
        return `<item>
  <title>${escapeXml(w.title)}</title>
  <description>${escapeXml(w.description ?? '')}</description>
  <pubDate>${w.createdAt.toUTCString()}</pubDate>
  <link>${appUrl}/works/${w.id}</link>
  <guid>${w.id}</guid>
  ${enclosure}
</item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(artist?.displayName ?? artistId)}</title>
    <link>${appUrl}/artists/${artistId}</link>
    <description>Werke von ${escapeXml(artist?.displayName ?? artistId)}</description>
    ${items}
  </channel>
</rss>`;
  }

  async recommendations(userId: string, limit = 20) {
    const loans = await this.prisma.loan.findMany({
      where: { userId },
      include: { work: { select: { type: true, category: true, artistId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const borrowedIds = new Set(loans.map(l => l.workId));
    if (loans.length === 0) {
      return this.prisma.work.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { borrowCount: 'desc' },
        take: limit,
        select: { id: true, title: true, type: true, loanPriceCents: true, borrowCount: true, artist: { select: { displayName: true } } },
      });
    }
    const typeCount: Record<string, number> = {};
    loans.forEach(l => { typeCount[l.work.type] = (typeCount[l.work.type] ?? 0) + 1; });
    const preferredType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    return this.prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        type: preferredType as never ?? undefined,
        id: { notIn: [...borrowedIds] },
      },
      orderBy: { borrowCount: 'desc' },
      take: limit,
      select: { id: true, title: true, type: true, loanPriceCents: true, borrowCount: true, artist: { select: { displayName: true } } },
    });
  }

  async getArtistForFeed(artistId: string) {
    return this.prisma.user.findUnique({ where: { id: artistId }, select: { displayName: true } });
  }

  async listByArtist(artistId: string, status: string, limit: number) {
    return this.prisma.work.findMany({
      where: { artistId, status: status as never },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, description: true, createdAt: true, type: true },
    });
  }

  // F-095: Work versioning (v1, v2 — replace with new recording)
  async addVersion(artistId: string, workId: string, mediaKey: string, note?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    if (work.mediaKey) {
      await this.prisma.workVersion.create({ data: { workId, mediaKey: work.mediaKey, note } });
    }
    return this.prisma.work.update({ where: { id: workId }, data: { mediaKey } });
  }

  async getVersionHistory(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    return this.prisma.workVersion.findMany({ where: { workId }, orderBy: { createdAt: 'desc' } });
  }

  async getRandomWork(type?: string, language?: string) {
    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (type) where.type = type;
    if (language) where.language = language;
    const count = await this.prisma.work.count({ where: where as never });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const works = await this.prisma.work.findMany({ where: where as never, take: 1, skip });
    return works[0] ?? null;
  }

  async getRandomWorks(count = 5, type?: string, language?: string) {
    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (type) where.type = type;
    if (language) where.language = language;
    const total = await this.prisma.work.count({ where: where as never });
    if (total === 0) return [];
    const works = await this.prisma.work.findMany({ where: where as never, take: Math.min(count, total) });
    // Shuffle in memory for randomness
    return works.sort(() => Math.random() - 0.5).slice(0, count);
  }

  async exportMetadata(artistId: string, format: 'json' | 'csv') {
    const works = await this.prisma.work.findMany({
      where: { artistId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (format === 'json') return works;
    const fields = ['id', 'title', 'type', 'status', 'loanPriceCents', 'loanDays', 'language', 'category', 'borrowCount', 'createdAt'];
    const header = fields.join(',');
    const rows = works.map((w) => fields.map((f) => JSON.stringify((w as Record<string, unknown>)[f] ?? '')).join(','));
    return [header, ...rows].join('\n');
  }

  getWorkQrCode(workId: string) {
    const url = `https://creatorlend.io/works/${workId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return { url, qrImageUrl };
  }

  /**
   * F-217: Newcomer-Charts – Künstler:innen aus den letzten 90 Tagen mit
   * den meisten Ausleihen auf ihren Werken.
   */
  async getNewcomerCharts(limit = 20) {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const newArtists = await this.prisma.user.findMany({
      where: { role: "ARTIST", createdAt: { gte: since }, deletedAt: null },
      select: { id: true, displayName: true },
    });
    if (newArtists.length === 0) return [];

    const results = await Promise.all(
      newArtists.map(async (artist) => {
        const agg = await this.prisma.work.aggregate({
          where: { artistId: artist.id, status: "PUBLISHED" },
          _sum: { borrowCount: true },
          _count: { id: true },
        });
        return {
          artistId: artist.id,
          displayName: artist.displayName,
          borrowCount: agg._sum.borrowCount ?? 0,
          workCount: agg._count.id,
        };
      }),
    );

    return results
      .filter((r) => r.workCount > 0)
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, limit);
  }

  /**
   * F-241/F-242: Wunschlisten-Sichtbarkeit setzen.
   */
  async setWishlistVisibility(userId: string, isPublic: boolean, slug?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        wishlistPublic: isPublic,
        ...(slug !== undefined ? { wishlistSlug: slug || null } : {}),
      },
      select: { id: true, wishlistPublic: true, wishlistSlug: true },
    });
  }

  /**
   * F-241/F-242: Öffentliche Wunschliste per Slug abrufen.
   */
  async getPublicWishlist(wishlistSlug: string) {
    const user = await this.prisma.user.findUnique({
      where: { wishlistSlug },
      select: { id: true, displayName: true, wishlistPublic: true },
    });
    if (!user || !user.wishlistPublic) throw new NotFoundException("wishlist_not_found");

    const wishlist = await this.prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        work: {
          select: { id: true, title: true, type: true, loanPriceCents: true, borrowCount: true,
            artist: { select: { displayName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { owner: { id: user.id, displayName: user.displayName }, items: wishlist };
  }

  /**
   * Detaillierte Metriken je Werk für das Künstler-Dashboard (B-142).
   * Nur der Eigentümer darf seine eigenen Werke einsehen.
   */
  async metrics(artistId: string, id: string) {
    await this.ownedWork(artistId, id);

    const [loans, renewals, pending, paid] = await Promise.all([
      this.prisma.loan.count({ where: { workId: id } }),
      this.prisma.loan.aggregate({
        where: { workId: id },
        _sum: { renewalCount: true },
      }),
      this.prisma.payoutItem.aggregate({
        where: { loan: { workId: id }, status: "PENDING" },
        _sum: { amountCents: true },
      }),
      this.prisma.payoutItem.aggregate({
        where: { loan: { workId: id }, status: "PAID" },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      workId: id,
      totalLoans: loans,
      totalRenewals: renewals._sum.renewalCount ?? 0,
      pendingCents: pending._sum.amountCents ?? 0,
      paidCents: paid._sum.amountCents ?? 0,
      totalRevenueCents: (pending._sum.amountCents ?? 0) + (paid._sum.amountCents ?? 0),
    };
  }

  // ─── F-452: Work performance table ───────────────────────────────────────

  /**
   * F-452: Performance table for all works of an artist.
   * Returns borrowCount, totalEarnings, avgRating, reviewCount per work.
   */
  async getPerformanceTable(artistId: string) {
    const works = await this.prisma.work.findMany({
      where: { artistId, deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        borrowCount: true,
        earningsGoalCents: true,
        loans: {
          select: {
            payoutItems: {
              select: { amountCents: true },
            },
          },
        },
        ratings: {
          select: { value: true },
        },
        reviews: {
          select: { id: true },
        },
      },
    });

    return works.map((w) => {
      const totalEarnings = w.loans.reduce(
        (sum, loan) => sum + loan.payoutItems.reduce((s, pi) => s + pi.amountCents, 0),
        0,
      );
      const avgRating =
        w.ratings.length > 0
          ? w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length
          : null;
      const goalProgress = w.earningsGoalCents && w.earningsGoalCents > 0
        ? Math.min(100, Math.round((totalEarnings / w.earningsGoalCents) * 100))
        : null;
      return {
        workId: w.id,
        title: w.title,
        type: w.type,
        status: w.status,
        borrowCount: w.borrowCount,
        totalEarnings,
        avgRating,
        reviewCount: w.reviews.length,
        goalProgress,
      };
    });
  }

  // ─── F-455: Promo price update ────────────────────────────────────────────

  /** F-455: Set promotional price for a work. */
  async setPromoPrice(artistId: string, workId: string, promoPrice: number | null, promoEndsAt: string | null) {
    await this.ownedWork(artistId, workId);
    return this.prisma.work.update({
      where: { id: workId },
      data: {
        promoPrice: promoPrice,
        promoEndsAt: promoEndsAt ? new Date(promoEndsAt) : null,
      },
      select: { id: true, loanPriceCents: true, promoPrice: true, promoEndsAt: true },
    });
  }

  // ─── F-460: Earnings goal ─────────────────────────────────────────────────

  /** F-460: Set earnings goal for a work. */
  async setEarningsGoal(artistId: string, workId: string, earningsGoalCents: number | null) {
    await this.ownedWork(artistId, workId);
    return this.prisma.work.update({
      where: { id: workId },
      data: { earningsGoalCents },
      select: { id: true, earningsGoalCents: true },
    });
  }

  // ─── F-581: Faceted search ────────────────────────────────────────────────

  /**
   * F-581: Search with facet aggregations.
   * Returns { total, works, facets: { types, languages, categories, priceRange } }.
   * F-582: Supports search operators: artist:"name", type:podcast, language:de.
   */
  async searchWithFacets(filter: SearchFilter & { q?: string }) {
    // F-582: Parse operators from query string
    let q = filter.q ?? "";
    let artistFilter: string | undefined;
    let typeFromOp: string | undefined;
    let langFromOp: string | undefined;

    // Extract operator: artist:"..." or artist:name
    const artistMatch = q.match(/artist:"([^"]+)"|artist:(\S+)/);
    if (artistMatch) {
      artistFilter = artistMatch[1] ?? artistMatch[2];
      q = q.replace(artistMatch[0], "").trim();
    }
    const typeMatch = q.match(/type:(\S+)/);
    if (typeMatch) {
      typeFromOp = typeMatch[1].toUpperCase();
      q = q.replace(typeMatch[0], "").trim();
    }
    const langMatch = q.match(/language:(\S+)/);
    if (langMatch) {
      langFromOp = langMatch[1];
      q = q.replace(langMatch[0], "").trim();
    }

    const effectiveFilter: SearchFilter = {
      ...filter,
      q: q || undefined,
      type: typeFromOp ?? filter.type,
      language: langFromOp ?? filter.language,
    };

    const now = new Date();
    const baseWhere: Prisma.WorkWhereInput = {
      status: "PUBLISHED",
      OR: [{ embargoUntil: null }, { embargoUntil: { lte: now } }],
      ...(effectiveFilter.type ? { type: effectiveFilter.type as never } : {}),
      ...(effectiveFilter.language ? { language: effectiveFilter.language } : {}),
      ...(effectiveFilter.category ? { category: effectiveFilter.category } : {}),
      ...(effectiveFilter.explicit === false ? { explicit: false } : {}),
      ...(effectiveFilter.minPrice !== undefined || effectiveFilter.maxPrice !== undefined
        ? {
            loanPriceCents: {
              ...(effectiveFilter.minPrice !== undefined ? { gte: effectiveFilter.minPrice } : {}),
              ...(effectiveFilter.maxPrice !== undefined ? { lte: effectiveFilter.maxPrice } : {}),
            },
          }
        : {}),
      ...(effectiveFilter.tags && effectiveFilter.tags.length > 0
        ? { tags: { hasSome: effectiveFilter.tags } }
        : {}),
      ...(effectiveFilter.q
        ? {
            OR: [
              { title: { contains: effectiveFilter.q, mode: "insensitive" } },
              { description: { contains: effectiveFilter.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(artistFilter
        ? {
            artist: { displayName: { contains: artistFilter, mode: "insensitive" } },
          }
        : {}),
    };

    const [works, total, typeCounts, langCounts, catCounts, priceAgg] = await Promise.all([
      this.prisma.work.findMany({ where: baseWhere, orderBy: { createdAt: "desc" }, take: 100 }),
      this.prisma.work.count({ where: baseWhere }),
      // Type facets
      this.prisma.work.groupBy({
        by: ["type"],
        where: { status: "PUBLISHED" },
        _count: { id: true },
      }),
      // Language facets
      this.prisma.work.groupBy({
        by: ["language"],
        where: { status: "PUBLISHED", language: { not: null } },
        _count: { id: true },
      }),
      // Category facets
      this.prisma.work.groupBy({
        by: ["category"],
        where: { status: "PUBLISHED", category: { not: null } },
        _count: { id: true },
      }),
      // Price range
      this.prisma.work.aggregate({
        where: { status: "PUBLISHED" },
        _min: { loanPriceCents: true },
        _max: { loanPriceCents: true },
      }),
    ]);

    return {
      total,
      works,
      facets: {
        types: typeCounts.map((t) => ({ value: t.type, count: t._count.id })),
        languages: langCounts.map((l) => ({ value: l.language, count: l._count.id })),
        categories: catCounts.map((c) => ({ value: c.category, count: c._count.id })),
        priceRange: {
          min: priceAgg._min.loanPriceCents ?? 0,
          max: priceAgg._max.loanPriceCents ?? 0,
        },
      },
    };
  }

  // ─── F-586: Related works ─────────────────────────────────────────────────

  /**
   * F-586: Returns 5 works related to the given work (same type/language/artist or tags).
   */
  async getRelatedWorks(workId: string, limit = 5) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");

    const related = await this.prisma.work.findMany({
      where: {
        id: { not: workId },
        status: "PUBLISHED",
        OR: [
          { artistId: work.artistId },
          { type: work.type, language: work.language ?? undefined },
          ...(work.tags.length > 0 ? [{ tags: { hasSome: work.tags } }] : []),
        ],
      },
      orderBy: { borrowCount: "desc" },
      take: limit,
      select: {
        id: true, title: true, type: true, language: true, borrowCount: true,
        loanPriceCents: true, artist: { select: { id: true, displayName: true } },
      },
    });
    return related;
  }

  // F-216: Top charts by loan count
  async getTopCharts(period: '7d' | '30d' | '365d' = '7d', limit = 20) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 365;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const groups = await this.prisma.loan.groupBy({
      by: ['workId'],
      where: { createdAt: { gte: startDate } },
      _count: { workId: true },
      orderBy: { _count: { workId: 'desc' } },
      take: limit,
    });

    if (groups.length === 0) return [];

    const workIds = groups.map((g: { workId: string }) => g.workId);
    const works = await this.prisma.work.findMany({
      where: { id: { in: workIds }, status: 'PUBLISHED' },
      select: {
        id: true, title: true, type: true, loanPriceCents: true, borrowCount: true,
        artist: { select: { id: true, displayName: true } },
      },
    });

    const countMap = new Map(groups.map((g: { workId: string; _count: { workId: number } }) => [g.workId, g._count.workId]));
    return works
      .map((w: { id: string; title: string; type: string; loanPriceCents: number; borrowCount: number; artist: { id: string; displayName: string } }) => ({ ...w, loanCount: countMap.get(w.id) ?? 0 }))
      .sort((a: { loanCount: number }, b: { loanCount: number }) => b.loanCount - a.loanCount);
  }
  // ─── F-129: Work stats ────────────────────────────────────────────────────

  async getWorkStats(artistId: string, workId: string) {
    await this.ownedWork(artistId, workId);
    const [totalLoans, activeLoans, renewals, exchanges, totalRevenue, playbackStats] = await Promise.all([
      this.prisma.loan.count({ where: { workId } }),
      this.prisma.loan.count({ where: { workId, status: 'ACTIVE' } }),
      this.prisma.loan.aggregate({ where: { workId }, _sum: { renewalCount: true } }),
      this.prisma.loan.count({ where: { workId, status: 'EXCHANGED' } }),
      this.prisma.payoutItem.aggregate({ where: { loan: { workId } }, _sum: { amountCents: true } }),
      // F-129: Abspielzeiten + Abbruchpunkte
      this.prisma.playbackPosition.aggregate({
        where: { workId },
        _avg: { positionSeconds: true },
        _count: { id: true },
      }),
    ]);
    const completedCount = await this.prisma.playbackPosition.count({ where: { workId, completedAt: { not: null } } });
    const totalListeners = playbackStats._count.id;
    return {
      totalLoans,
      activeLoans,
      totalRenewals: renewals._sum.renewalCount ?? 0,
      totalExchanges: exchanges,
      totalRevenueCents: totalRevenue._sum.amountCents ?? 0,
      // F-129: Playback-Statistiken (Abspielzeiten, Abbruchpunkte)
      playback: {
        totalListeners,
        avgPlaybackPositionSeconds: Math.round(playbackStats._avg.positionSeconds ?? 0),
        completedCount,
        completionRate: totalListeners > 0 ? Math.round((completedCount / totalListeners) * 100) : 0,
      },
    };
  }

  // ─── F-131: Conversion rate ───────────────────────────────────────────────

  async getConversionRate(workId: string) {
    const loans = await this.prisma.loan.count({ where: { workId } });
    return { previewPlays: 0, loans, conversionRate: 0 };
  }

  // ─── F-234/F-235: Share info ──────────────────────────────────────────────

  async getShareInfo(workId: string) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, description: true, coverKey: true },
    });
    if (!work) throw new NotFoundException('work_not_found');
    return {
      deepLink: `creatorlend://works/${workId}`,
      webUrl: `https://creatorlend.io/works/${workId}`,
      ogTitle: work.title,
      ogDescription: work.description?.slice(0, 160) ?? null,
      ogImage: work.coverKey,
    };
  }

  // ─── F-183/F-184: Fuzzy autocomplete search suggestions ─────────────────

  async searchSuggestions(q: string, limit = 10) {
    if (!q || q.length < 2) return { suggestions: [] };
    const term = q.toLowerCase().trim();
    // Title prefix match + fuzzy "contains" fallback
    const works = await this.prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { startsWith: q, mode: 'insensitive' } },
          { title: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, type: true, artist: { select: { displayName: true } } },
      take: limit,
      orderBy: { borrowCount: 'desc' },
    });
    // Unique artist suggestions
    const artistRows = await this.prisma.user.findMany({
      where: {
        role: 'ARTIST',
        displayName: { contains: term, mode: 'insensitive' },
      },
      select: { id: true, displayName: true },
      take: 5,
    });
    return {
      works: works.map((w: { id: string; title: string; type: string; artist: { displayName: string } }) => ({
        id: w.id, label: w.title, type: w.type, artist: w.artist.displayName,
      })),
      artists: artistRows.map((a: { id: string; displayName: string }) => ({ id: a.id, label: a.displayName })),
    };
  }

  // ─── F-222: "Neu auf CreatorLend" – zuletzt veröffentlichte Werke ────────

  async getNewArrivals(limit = 20) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // last 14 days
    return this.prisma.work.findMany({
      where: { status: 'PUBLISHED', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, title: true, type: true, loanPriceCents: true, createdAt: true,
        artist: { select: { id: true, displayName: true } },
      },
    });
  }

  // ─── F-144: Tag suggestions ───────────────────────────────────────────────

  suggestTags(title: string, description: string) {
    // AI stub
    return { tags: ['audiobook', 'fiction', 'literature'] };
  }

  // ─── F-112: Update license type ───────────────────────────────────────────

  async updateLicenseType(artistId: string, workId: string, licenseType: string) {
    await this.ownedWork(artistId, workId);
    return this.prisma.work.update({ where: { id: workId }, data: { licenseType } });
  }

  // ─── F-133: Featured works ────────────────────────────────────────────────

  async getFeaturedWorks() {
    return this.prisma.work.findMany({
      where: { isFeatured: true, status: 'PUBLISHED' },
      orderBy: { featuredAt: 'desc' },
    });
  }

  // ─── F-761: Self-Service-Analytics-Portal ────────────────────────────────

  async getAnalyticsPortal(artistId: string) {
    const works = await this.prisma.work.findMany({
      where: { artistId, status: 'PUBLISHED' },
      select: { id: true, title: true, loanPriceCents: true, createdAt: true },
    });
    const workIds = works.map((w) => w.id);
    const [totalLoans, activeLoans, totalRevenue, followers, avgRating] = await Promise.all([
      this.prisma.loan.count({ where: { workId: { in: workIds } } }),
      this.prisma.loan.count({ where: { workId: { in: workIds }, status: 'ACTIVE' } }),
      this.prisma.payoutItem.aggregate({ where: { loan: { workId: { in: workIds } } }, _sum: { amountCents: true } }),
      this.prisma.follow.count({ where: { artistId } }),
      this.prisma.review.aggregate({ where: { workId: { in: workIds } }, _avg: { rating: true } }),
    ]);
    return {
      publishedWorks: works.length,
      totalLoans,
      activeLoans,
      totalRevenueCents: totalRevenue._sum.amountCents ?? 0,
      followers,
      avgRating: Math.round((avgRating._avg.rating ?? 0) * 10) / 10,
      works: works.map((w) => ({ id: w.id, title: w.title, priceCents: w.loanPriceCents })),
    };
  }

  // F-618: Trending-Tag-Cloud (Häufigkeit je Tag über alle PUBLISHED Werke)
  async getTagCloud(limit = 50): Promise<{ tag: string; count: number }[]> {
    const works = await this.prisma.work.findMany({
      where: { status: 'PUBLISHED' },
      select: { tags: true },
    });
    const tagCounts: Record<string, number> = {};
    for (const w of works) {
      for (const tag of w.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // F-376: Preisempfehlung für Künstler:in je WorkType
  async getPriceRecommendation(workType: string) {
    const agg = await this.prisma.work.aggregate({
      where: { type: workType as never, status: 'PUBLISHED', loanPriceCents: { gt: 0 } },
      _avg: { loanPriceCents: true },
      _min: { loanPriceCents: true },
      _max: { loanPriceCents: true },
    });
    const avg = Math.round(agg._avg.loanPriceCents ?? 150);
    return {
      workType,
      recommendedCents: avg,
      minCents: agg._min.loanPriceCents ?? 50,
      maxCents: agg._max.loanPriceCents ?? 500,
      platformMinCents: 50,
      platformMaxCents: 500,
    };
  }

  // ─── F-386/F-387: Multi-Artist Revenue Split ─────────────────────────────

  /** Setzt die Einnahmenteilung für ein kollaboratives Werk. splits: [{artistId, pct}], Summe muss 100 sein. */
  async setRevenueShares(artistId: string, workId: string, splits: { artistId: string; pct: number }[]) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    if (work.artistId !== artistId) throw new ForbiddenException('not_your_work');
    const total = splits.reduce((s, r) => s + r.pct, 0);
    if (Math.abs(total - 100) > 0.01) throw new BadRequestException('splits_must_sum_to_100');
    return this.prisma.work.update({
      where: { id: workId },
      data: { revenueShares: splits as never },
      select: { id: true, revenueShares: true },
    });
  }

  /** Gibt die konfigurierte Einnahmenteilung zurück. */
  async getRevenueShares(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { id: true, revenueShares: true } });
    if (!work) throw new NotFoundException('work_not_found');
    return work;
  }

  // ─── F-413/F-414: Multi-currency ─────────────────────────────────────────

  /** Stub: gibt Betrag in Zielwährung zurück (Umrechnung via hartkodiertem Kurs). */
  async convertCurrency(amountCents: number, from: string, to: string) {
    const rates: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.86 };
    const fromRate = rates[from.toUpperCase()] ?? 1;
    const toRate = rates[to.toUpperCase()] ?? 1;
    const converted = Math.round(amountCents * (toRate / fromRate));
    return { from, to, originalCents: amountCents, convertedCents: converted, rate: toRate / fromRate };
  }

  // F-103: Transcript upload (SRT, VTT, TXT)
  async uploadTranscript(artistId: string, workId: string, content: string, format: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    await this.prisma.appSetting.upsert({
      where: { key: `transcript:${workId}` },
      update: { value: JSON.stringify({ content, format, updatedAt: new Date().toISOString() }) },
      create: { key: `transcript:${workId}`, value: JSON.stringify({ content, format, updatedAt: new Date().toISOString() }) },
    });
    return { workId, format, length: content.length, stored: true };
  }

  // F-105: Transcript full-text search within a work
  async searchTranscript(workId: string, query: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: `transcript:${workId}` } });
    if (!setting) return { workId, query, results: [] };
    const { content } = JSON.parse(setting.value) as { content: string };
    const lines = content.split('\n').filter(l => l.toLowerCase().includes(query.toLowerCase()));
    return { workId, query, results: lines.slice(0, 20), totalMatches: lines.length };
  }

  // F-108: Subtitles/captions for hearing impaired
  async getSubtitles(workId: string, language?: string) {
    const key = `subtitles:${workId}:${language ?? 'default'}`;
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return setting ? JSON.parse(setting.value) : { workId, language, available: false, formats: [] };
  }

  async uploadSubtitles(artistId: string, workId: string, content: string, language: string, format: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    const key = `subtitles:${workId}:${language}`;
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value: JSON.stringify({ content, language, format, updatedAt: new Date().toISOString() }) },
      create: { key, value: JSON.stringify({ content, language, format, updatedAt: new Date().toISOString() }) },
    });
    return { workId, language, format, stored: true };
  }

  // F-109: Audio description as separate track for visually impaired
  getAudioDescriptionInfo(workId: string) {
    return {
      workId,
      enabled: false,
      note: 'Upload audio description track separately. Use POST /works/:id/audio-description.',
      formats: ['mp3', 'aac', 'm4a'],
    };
  }

  // F-117: Work series — link multiple works
  async getWorkSeries(workId: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: `series:${workId}` } });
    return setting ? JSON.parse(setting.value) : { workId, seriesId: null, seriesTitle: null, position: null };
  }

  async setWorkSeries(artistId: string, workId: string, seriesId: string, position: number) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    await this.prisma.appSetting.upsert({
      where: { key: `series:${workId}` },
      update: { value: JSON.stringify({ workId, seriesId, position }) },
      create: { key: `series:${workId}`, value: JSON.stringify({ workId, seriesId, position }) },
    });
    return { workId, seriesId, position };
  }

  // F-118: Series order + progress tracking
  async getSeriesProgress(userId: string, seriesId: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: `series_progress:${userId}:${seriesId}` } });
    return setting ? JSON.parse(setting.value) : { userId, seriesId, completedWorks: [], currentPosition: 0 };
  }

  // F-123: Split-view: transcript + player config
  getSplitViewConfig() {
    return {
      enabled: true,
      layout: 'side-by-side',
      syncScrollToPlayback: true,
      highlightCurrentLine: true,
      note: 'Client-side feature. API provides transcript via GET /works/:id/transcript.',
    };
  }

  // F-149: Work translations (title/description in multiple languages)
  async getWorkTranslations(workId: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: `translations:${workId}` } });
    return setting ? JSON.parse(setting.value) : { workId, translations: {} };
  }

  async setWorkTranslation(artistId: string, workId: string, lang: string, title: string, description: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    const existing = await this.prisma.appSetting.findUnique({ where: { key: `translations:${workId}` } });
    const translations = existing ? JSON.parse(existing.value).translations : {};
    translations[lang] = { title, description };
    await this.prisma.appSetting.upsert({
      where: { key: `translations:${workId}` },
      update: { value: JSON.stringify({ workId, translations }) },
      create: { key: `translations:${workId}`, value: JSON.stringify({ workId, translations }) },
    });
    return { workId, lang, title, description };
  }

  // F-151: Lyrics upload + sync (LRC format)
  async uploadLyrics(artistId: string, workId: string, content: string, format: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    await this.prisma.appSetting.upsert({
      where: { key: `lyrics:${workId}` },
      update: { value: JSON.stringify({ content, format, updatedAt: new Date().toISOString() }) },
      create: { key: `lyrics:${workId}`, value: JSON.stringify({ content, format, updatedAt: new Date().toISOString() }) },
    });
    return { workId, format, stored: true };
  }

  async getLyrics(workId: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: `lyrics:${workId}` } });
    return setting ? JSON.parse(setting.value) : { workId, available: false };
  }

  // F-152: Lyrics full-text search
  async searchLyrics(query: string) {
    return {
      query,
      note: 'Production: full-text search across all lyrics via Elasticsearch. AppSetting-based implementation is a stub.',
      results: [],
    };
  }

  // F-156: Audio description text for accessibility
  async getAudioDescriptionText(workId: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: `audio_description_text:${workId}` } });
    return setting ? JSON.parse(setting.value) : { workId, text: null, available: false };
  }

  // F-174: AI work summary (2-sentence abstract)
  async getAiSummary(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { title: true, description: true } });
    if (!work) throw new NotFoundException('work_not_found');
    return {
      workId,
      summary: work.description?.slice(0, 280) ?? `"${work.title}" — a creative work available on CreatorLend.`,
      generated: false,
      note: 'Production: use Claude API to generate 2-sentence abstract from description + transcript.',
    };
  }

  // F-176: Cosine similarity for audio features
  getSimilarityConfig() {
    return {
      enabled: false,
      algorithm: 'cosine_similarity',
      features: ['tempo', 'energy', 'valence', 'acousticness', 'instrumentalness'],
      provider: 'Essentia (planned)',
      note: 'Upload audio → extract features → store embedding → find k-nearest neighbors.',
    };
  }

  // F-192: Filter works with transcript
  async listWorksWithTranscript(page = 1, limit = 20) {
    const keys = await this.prisma.appSetting.findMany({
      where: { key: { startsWith: 'transcript:' } },
      select: { key: true },
      take: limit,
      skip: (page - 1) * limit,
    });
    const workIds = keys.map(k => k.key.replace('transcript:', ''));
    const works = await this.prisma.work.findMany({
      where: { id: { in: workIds }, status: 'PUBLISHED' },
      select: { id: true, title: true, type: true, artistId: true },
    });
    return { works, page, limit };
  }

  // F-193: Filter works with preview
  async listWorksWithPreview(page = 1, limit = 20) {
    const works = await this.prisma.work.findMany({
      where: { status: 'PUBLISHED', previewKey: { not: null } },
      select: { id: true, title: true, type: true, artistId: true, previewKey: true },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { works, page, limit };
  }

  // F-197: Filter new works (last 7 days)
  async listNewWorks(page = 1, limit = 20) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [works, total] = await Promise.all([
      this.prisma.work.findMany({
        where: { status: 'PUBLISHED', createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: { id: true, title: true, type: true, artistId: true, createdAt: true },
      }),
      this.prisma.work.count({ where: { status: 'PUBLISHED', createdAt: { gte: since } } }),
    ]);
    return { works, total, page, limit };
  }

  // F-203: Mood board (work collage by mood)
  async getMoodBoard(mood: string) {
    const works = await this.prisma.work.findMany({
      where: { status: 'PUBLISHED', tags: { has: mood } },
      take: 9,
      select: { id: true, title: true, coverKey: true },
    });
    return { mood, works, note: 'Filter by mood-tag. Tag works with moods at POST /works/:id/tags.' };
  }

  // F-204: World map — works by country of artist
  async getWorksByCountry() {
    const works = await this.prisma.work.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, artist: { select: { id: true, displayName: true } } },
      take: 500,
    });
    return { note: 'Production: join with User.country field. Map rendering done client-side (Mapbox/Leaflet).', count: works.length };
  }

  // F-205: Timeline — works by release year
  async getWorksByYear(year?: number) {
    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31T23:59:59`);
      where.createdAt = { gte: start, lte: end };
    }
    const works = await this.prisma.work.findMany({
      where: where as never,
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return { year, works, total: works.length };
  }

  // F-206: Personalized homepage based on listening behavior
  async getPersonalizedHomepage(userId: string) {
    const recentLoans = await this.prisma.loan.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { work: { select: { type: true, tags: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const preferredTypes = [...new Set(recentLoans.map(l => l.work.type))];
    const recommendations = await this.prisma.work.findMany({
      where: { status: 'PUBLISHED', type: { in: preferredTypes.length ? preferredTypes : undefined } },
      orderBy: { borrowCount: 'desc' },
      take: 12,
      select: { id: true, title: true, type: true, artistId: true, borrowCount: true },
    });
    return { userId, recommendations, preferredTypes };
  }

  // F-207: "Because you listened to X" recommendations
  async getRelatedRecommendations(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { type: true, tags: true } });
    if (!work) throw new NotFoundException('work_not_found');
    const similar = await this.prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: workId },
        OR: [{ type: work.type }, { tags: { hasSome: work.tags } }],
      },
      take: 8,
      select: { id: true, title: true, type: true, artistId: true },
    });
    return { basedOnWorkId: workId, recommendations: similar };
  }

  // ─── F-763: Revenue export als CSV ───────────────────────────────────────

  async exportRevenueAsCsv(artistId: string): Promise<string> {
    const works = await this.prisma.work.findMany({
      where: { artistId },
      select: { id: true, title: true },
    });
    const workMap = Object.fromEntries(works.map((w) => [w.id, w.title]));
    const items = await this.prisma.payoutItem.findMany({
      where: { loan: { work: { artistId } } },
      include: { loan: { select: { workId: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const header = 'date,work_id,work_title,amount_cents,status';
    const rows = items.map((i) =>
      [
        i.createdAt.toISOString().slice(0, 10),
        i.loan.workId,
        JSON.stringify(workMap[i.loan.workId] ?? ''),
        i.amountCents,
        i.status,
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }
}
