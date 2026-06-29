import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { NotificationsService } from "../notifications/notifications.service";

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

  async publish(artistId: string, id: string) {
    const work = await this.ownedWork(artistId, id);
    const updated = await this.prisma.work.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    // Follower:innen der Künstler:in benachrichtigen (B-126)
    const followers = await this.prisma.follow.findMany({
      where: { artistId },
      select: { followerId: true },
    });
    if (followers.length > 0) {
      await this.notifications.createMany(
        followers.map((f) => ({
          userId: f.followerId,
          type: "NEW_WORK",
          title: "Neues Werk verfügbar",
          body: `„${work.title}" ist jetzt ausleihbar.`,
          data: { workId: id, artistId },
        })),
      );
    }

    return updated;
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
   */
  search(filter: SearchFilter) {
    const where: Prisma.WorkWhereInput = {
      status: "PUBLISHED",
      ...(filter.type ? { type: filter.type as never } : {}),
      ...(filter.language ? { language: filter.language } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      // Explicit-Content-Filter (B-038): explicit=false schließt explizite Werke aus
      ...(filter.explicit === false ? { explicit: false } : {}),
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

  async get(id: string) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
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

  async restore(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    return this.prisma.work.update({ where: { id: workId }, data: { archivedAt: null } });
  }

  async clone(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    const { id, createdAt, updatedAt, borrowCount, publishAt, archivedAt, ...rest } = work;
    return this.prisma.work.create({ data: { ...rest, title: `${work.title} (Kopie)`, status: 'DRAFT', borrowCount: 0 } });
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
