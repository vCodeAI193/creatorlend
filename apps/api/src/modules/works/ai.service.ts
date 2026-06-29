import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async summarize(workId: string) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, description: true, type: true },
    });
    if (!work) throw new Error('work_not_found');
    // Stub: return first 200 chars of description as summary
    const summary =
      (work.description ?? '').slice(0, 200) ||
      `Ein ${work.type}-Werk ohne Beschreibung.`;
    return { workId, summary, generated: false };
  }

  async critique(workId: string) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, ratings: { select: { value: true } } },
    });
    if (!work) throw new Error('work_not_found');
    const avg = work.ratings.length
      ? work.ratings.reduce((s, r) => s + r.value, 0) / work.ratings.length
      : 0;
    const critique =
      avg >= 4
        ? `„${work.title}" ist ein hochbewertetes Werk mit einer durchschnittlichen Bewertung von ${avg.toFixed(1)}.`
        : avg >= 2.5
          ? `„${work.title}" erhält gemischte Reaktionen (Ø ${avg.toFixed(1)}).`
          : `„${work.title}" hat bisher wenige Bewertungen.`;
    return { workId, critique, generated: false };
  }
}
