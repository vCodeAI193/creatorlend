import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PLATFORM_FEE_PCT = parseInt(process.env.PLATFORM_FEE_PERCENT ?? '30', 10) / 100;

@Injectable()
export class TaxStatementService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(artistId: string, year: number) {
    const from = new Date(year, 0, 1);
    const to = new Date(year + 1, 0, 1);
    const items = await this.prisma.payoutItem.findMany({
      where: { artistId, status: 'PAID', createdAt: { gte: from, lt: to } },
      include: { loan: { select: { work: { select: { title: true } } } } },
    });
    const totalNetCents = items.reduce((s, i) => s + i.amountCents, 0);
    const totalGrossCents = Math.round(totalNetCents / (1 - PLATFORM_FEE_PCT));
    const totalFeeCents = totalGrossCents - totalNetCents;

    const byQuarter: Record<number, { grossCents: number; feeCents: number; netCents: number }> = {};
    for (let q = 1; q <= 4; q++) byQuarter[q] = { grossCents: 0, feeCents: 0, netCents: 0 };
    for (const item of items) {
      const q = Math.ceil((item.createdAt.getMonth() + 1) / 3);
      byQuarter[q].netCents += item.amountCents;
    }
    for (const q of [1, 2, 3, 4]) {
      const net = byQuarter[q].netCents;
      byQuarter[q].grossCents = Math.round(net / (1 - PLATFORM_FEE_PCT));
      byQuarter[q].feeCents = byQuarter[q].grossCents - net;
    }

    const workMap: Record<string, { workTitle: string; count: number; netCents: number }> = {};
    for (const item of items) {
      const title = item.loan.work.title;
      if (!workMap[title]) workMap[title] = { workTitle: title, count: 0, netCents: 0 };
      workMap[title].count += 1;
      workMap[title].netCents += item.amountCents;
    }

    return {
      year,
      artistId,
      totalGrossCents,
      totalFeeCents,
      totalNetCents,
      byQuarter: [1, 2, 3, 4].map((q) => ({ q, ...byQuarter[q] })),
      items: Object.values(workMap).map((w) => ({
        ...w,
        grossCents: Math.round(w.netCents / (1 - PLATFORM_FEE_PCT)),
      })),
    };
  }

  async listAvailableYears(artistId: string) {
    const rows = await this.prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM "createdAt")::int AS year
      FROM "PayoutItem"
      WHERE "artistId" = ${artistId} AND status = 'PAID'
      ORDER BY year DESC
    `;
    return rows.map((r) => r.year);
  }
}
