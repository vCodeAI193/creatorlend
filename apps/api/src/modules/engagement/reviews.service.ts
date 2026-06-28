import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rezension anlegen oder aktualisieren (B-130). */
  async upsert(userId: string, workId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException("review_body_required");
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");

    return this.prisma.review.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, body },
      update: { body },
      select: { id: true, workId: true, userId: true, body: true, createdAt: true, updatedAt: true },
    });
  }

  /** Eigene Rezension löschen. */
  async remove(userId: string, workId: string) {
    await this.prisma.review.deleteMany({ where: { userId, workId } });
    return { deleted: true };
  }

  /** Alle sichtbaren Rezensionen für ein Werk. */
  async list(workId: string) {
    return this.prisma.review.findMany({
      where: { workId, hidden: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        workId: true,
        body: true,
        createdAt: true,
        user: { select: { id: true, displayName: true } },
      },
    });
  }

  /** Rezension ausblenden (B-131, Moderation). Nur ADMIN. */
  async hide(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("review_not_found");
    return this.prisma.review.update({ where: { id: reviewId }, data: { hidden: true } });
  }
}
