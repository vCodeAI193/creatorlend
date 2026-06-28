import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sternebewertung anlegen oder aktualisieren (B-129). Wert 1–5. */
  async upsert(userId: string, workId: string, value: number) {
    if (value < 1 || value > 5) throw new BadRequestException("rating_value_must_be_1_to_5");
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");

    return this.prisma.rating.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, value },
      update: { value },
    });
  }

  /** Bewertung entfernen. */
  async remove(userId: string, workId: string) {
    await this.prisma.rating.deleteMany({ where: { userId, workId } });
    return { deleted: true };
  }

  /** Durchschnittsbewertung und Anzahl für ein Werk. */
  async summary(workId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: { workId },
      _avg: { value: true },
      _count: { value: true },
    });
    const myRating = null; // caller enriches if needed
    return {
      workId,
      average: agg._avg.value ? Math.round(agg._avg.value * 10) / 10 : null,
      count: agg._count.value,
      myRating,
    };
  }
}
