import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";

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
      },
    });
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

    const where: Prisma.WorkWhereInput = {
      status: "PUBLISHED",
      // F-113: Embargo-Filter – nur Werke ohne oder mit abgelaufenem Embargo
      OR: [{ embargoUntil: null }, { embargoUntil: { lte: now } }],
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
    return work;
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

  async clone(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    const { id, createdAt, updatedAt, borrowCount, publishAt, archivedAt, deletedAt, ...rest } = work;
    return this.prisma.work.create({ data: { ...rest, title: `${work.title} (Kopie)`, status: 'DRAFT', borrowCount: 0 } });
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
}
