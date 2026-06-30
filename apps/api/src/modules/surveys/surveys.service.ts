import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  // F-809: NPS-Umfrage einreichen
  async submitNps(userId: string, score: number, comment?: string) {
    if (score < 0 || score > 10) throw new BadRequestException('nps_score_must_be_0_to_10');
    return this.prisma.npsSurvey.create({ data: { userId, score, comment } });
  }

  // F-809: NPS-Statistiken (Admin)
  async getNpsStats() {
    const surveys = await this.prisma.npsSurvey.findMany({ select: { score: true } });
    if (surveys.length === 0) return { count: 0, nps: 0, promoters: 0, passives: 0, detractors: 0 };
    const promoters = surveys.filter((s) => s.score >= 9).length;
    const passives = surveys.filter((s) => s.score >= 7 && s.score <= 8).length;
    const detractors = surveys.filter((s) => s.score <= 6).length;
    const nps = Math.round(((promoters - detractors) / surveys.length) * 100);
    return { count: surveys.length, nps, promoters, passives, detractors };
  }

  // F-800: Custom-Event tracken
  async trackEvent(userId: string | undefined, eventName: string, properties?: Prisma.InputJsonValue, sessionId?: string) {
    return this.prisma.customEvent.create({
      data: { userId, eventName, properties, sessionId },
    });
  }

  // F-800: Event-Statistiken (Admin)
  async getEventStats(eventName: string, fromDate?: string) {
    const where = {
      eventName,
      ...(fromDate ? { createdAt: { gte: new Date(fromDate) } } : {}),
    };
    const count = await this.prisma.customEvent.count({ where });
    return { eventName, count };
  }

  // F-800: Alle Event-Typen auflisten (Admin)
  async listEventTypes() {
    const rows = await this.prisma.$queryRaw<Array<{ eventName: string; cnt: bigint }>>`
      SELECT "eventName", COUNT(*) AS cnt FROM "CustomEvent" GROUP BY "eventName" ORDER BY cnt DESC LIMIT 100
    `;
    return rows.map((r) => ({ eventName: r.eventName, count: Number(r.cnt) }));
  }
}
