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
  durationSeconds?: number;
  language?: string;
  category?: string;
}

export interface SearchFilter {
  type?: string;
  q?: string;
  language?: string;
  category?: string;
  sort?: string; // "new" | "popular"
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
        durationSeconds: input.durationSeconds,
        language: input.language,
        category: input.category,
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
      ...(filter.q
        ? {
            OR: [
              { title: { contains: filter.q, mode: "insensitive" } },
              { description: { contains: filter.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.WorkOrderByWithRelationInput =
      filter.sort === "popular"
        ? { borrowCount: "desc" }
        : { createdAt: "desc" };

    return this.prisma.work.findMany({ where, orderBy, take: 100 });
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
