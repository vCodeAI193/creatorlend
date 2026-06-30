import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // F-802: UTM-Parameter tracken
  async trackUtm(data: {
    userId?: string;
    sessionId?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    page?: string;
    referrer?: string;
  }) {
    return this.prisma.utmEvent.create({ data });
  }

  // F-801: Attribution-Report (Herkunft neuer Nutzer:innen)
  async getAttribution(from?: string) {
    const where = from ? { createdAt: { gte: new Date(from) } } : {};
    const rows = await this.prisma.$queryRaw<Array<{ source: string | null; medium: string | null; cnt: bigint }>>`
      SELECT source, medium, COUNT(*) AS cnt
      FROM "UtmEvent"
      WHERE ${from ? `"createdAt" >= ${new Date(from).toISOString()}::timestamp` : 'TRUE'}
      GROUP BY source, medium
      ORDER BY cnt DESC
      LIMIT 50
    `;
    return rows.map((r) => ({ source: r.source, medium: r.medium, count: Number(r.cnt) }));
  }

  // F-802: Top-Kampagnen
  async getCampaignStats(from?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ campaign: string | null; cnt: bigint }>>`
      SELECT campaign, COUNT(*) AS cnt
      FROM "UtmEvent"
      WHERE campaign IS NOT NULL
        AND ${from ? `"createdAt" >= ${new Date(from ?? '2000-01-01').toISOString()}::timestamp` : 'TRUE'}
      GROUP BY campaign
      ORDER BY cnt DESC
      LIMIT 50
    `;
    return rows.map((r) => ({ campaign: r.campaign, count: Number(r.cnt) }));
  }

  // F-796: Bot-Traffic-Anteil (heuristisch via sessionId = null)
  async getBotTrafficShare() {
    const total = await this.prisma.customEvent.count();
    const withSession = await this.prisma.customEvent.count({ where: { sessionId: { not: null } } });
    const botEstimate = total - withSession;
    return {
      total,
      estimatedBots: botEstimate,
      botSharePercent: total > 0 ? Math.round((botEstimate / total) * 100) : 0,
    };
  }
}
