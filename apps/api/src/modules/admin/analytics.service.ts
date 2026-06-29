import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCohortRetention(cohortMonths = 6) {
    const rows = await this.prisma.$queryRaw<
      Array<{ cohort: string; month_offset: number; active_users: bigint; cohort_size: bigint }>
    >`
      WITH cohorts AS (
        SELECT id, TO_CHAR("createdAt", 'YYYY-MM') AS cohort
        FROM "User"
        WHERE "deletedAt" IS NULL
      ),
      cohort_sizes AS (
        SELECT cohort, COUNT(*) AS cohort_size
        FROM cohorts
        GROUP BY cohort
        ORDER BY cohort DESC
        LIMIT ${cohortMonths}
      ),
      activity AS (
        SELECT DISTINCT l."userId", TO_CHAR(l."createdAt", 'YYYY-MM') AS active_month
        FROM "Loan" l
      )
      SELECT
        u.cohort,
        (EXTRACT(YEAR FROM TO_DATE(a.active_month, 'YYYY-MM')) * 12 +
         EXTRACT(MONTH FROM TO_DATE(a.active_month, 'YYYY-MM'))) -
        (EXTRACT(YEAR FROM TO_DATE(u.cohort, 'YYYY-MM')) * 12 +
         EXTRACT(MONTH FROM TO_DATE(u.cohort, 'YYYY-MM'))) AS month_offset,
        COUNT(DISTINCT u.id) AS active_users,
        cs.cohort_size
      FROM cohorts u
      JOIN cohort_sizes cs ON cs.cohort = u.cohort
      JOIN activity a ON a."userId" = u.id
      AND a.active_month >= u.cohort
      GROUP BY u.cohort, month_offset, cs.cohort_size
      ORDER BY u.cohort DESC, month_offset ASC
    `;

    const cohortMap: Record<string, { cohort: string; size: number; retention: number[] }> = {};
    for (const row of rows) {
      if (!cohortMap[row.cohort]) {
        cohortMap[row.cohort] = { cohort: row.cohort, size: Number(row.cohort_size), retention: [] };
      }
      const offset = Number(row.month_offset);
      const pct = Math.round((Number(row.active_users) / Number(row.cohort_size)) * 100);
      cohortMap[row.cohort].retention[offset] = pct;
    }
    return { cohorts: Object.values(cohortMap) };
  }

  async getRetentionCurve(daysMax = 365) {
    const days = [1, 7, 14, 30, 60, 90, 180, 365].filter((d) => d <= daysMax);
    const totalUsers = await this.prisma.user.count({ where: { deletedAt: null } });
    if (totalUsers === 0) return { points: days.map((day) => ({ day, retainedPct: 0 })) };

    const points = await Promise.all(
      days.map(async (day) => {
        const count = await this.prisma.$queryRaw<[{ cnt: bigint }]>`
          SELECT COUNT(DISTINCT u.id) AS cnt
          FROM "User" u
          JOIN "Loan" l ON l."userId" = u.id
          WHERE u."deletedAt" IS NULL
            AND l."createdAt" >= u."createdAt" + INTERVAL '1 day' * ${day - 1}
            AND l."createdAt" < u."createdAt" + INTERVAL '1 day' * ${day + 1}
        `;
        const retainedPct = Math.round((Number(count[0].cnt) / totalUsers) * 100);
        return { day, retainedPct };
      }),
    );
    return { points };
  }

  async getUserGrowth(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    const truncFn = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
    const rows = await this.prisma.$queryRaw<Array<{ date: Date; new_users: bigint }>>`
      SELECT DATE_TRUNC(${truncFn}, "createdAt") AS date, COUNT(*) AS new_users
      FROM "User"
      WHERE "deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    let cumulative = 0;
    return {
      points: rows.map((r) => {
        cumulative += Number(r.new_users);
        return { date: r.date, newUsers: Number(r.new_users), cumulativeUsers: cumulative };
      }),
    };
  }

  /** F-755: Aktivitäts-Heatmap nach Tag. */
  async getActivityHeatmap(year?: number) {
    const y = year ?? new Date().getFullYear();
    const rows = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM "Loan"
      WHERE EXTRACT(YEAR FROM "createdAt") = ${y}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return { year: y, days: rows.map(r => ({ date: r.date, count: Number(r.count) })) };
  }

  /** F-760: Conversion-Funnel. */
  async getConversionFunnel() {
    const [registered, emailVerified, subscribed, firstLoanUsers, returnedUsers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, emailVerified: true } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.$queryRaw<[{ cnt: bigint }]>`SELECT COUNT(DISTINCT "userId") AS cnt FROM "Loan"`,
      this.prisma.$queryRaw<[{ cnt: bigint }]>`SELECT COUNT(*) AS cnt FROM (SELECT "userId" FROM "Loan" GROUP BY "userId" HAVING COUNT(*) > 1) sub`,
    ]);
    return {
      registered,
      emailVerified,
      subscribed,
      firstLoan: Number(firstLoanUsers[0].cnt),
      returned: Number(returnedUsers[0].cnt),
    };
  }

  /** F-762: Churn-Analyse. */
  async getChurnAnalysis(period?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ month: string; churned: bigint; total: bigint }>>`
      SELECT
        TO_CHAR(se."createdAt", 'YYYY-MM') AS month,
        COUNT(*) FILTER (WHERE se.event = 'SUBSCRIPTION_CANCELLED') AS churned,
        COUNT(DISTINCT s."userId") AS total
      FROM "SubscriptionEvent" se
      JOIN "Subscription" s ON s."userId" = se."userId"
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return {
      months: rows.map(r => ({
        month: r.month,
        churned: Number(r.churned),
        total: Number(r.total),
        rate: Number(r.total) > 0 ? Number(r.churned) / Number(r.total) : 0,
      })),
    };
  }

  async getRevenueMetrics(period: 'monthly' | 'weekly' | 'daily' = 'monthly') {
    const truncFn = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
    const rows = await this.prisma.$queryRaw<
      Array<{ month: Date; total_cents: bigint; user_count: bigint }>
    >`
      SELECT
        DATE_TRUNC(${truncFn}, pi."createdAt") AS month,
        SUM(pi."amountCents") AS total_cents,
        COUNT(DISTINCT l."userId") AS user_count
      FROM "PayoutItem" pi
      JOIN "Loan" l ON l.id = pi."loanId"
      WHERE pi.status = 'PAID'
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return {
      points: rows.map((r) => {
        const mrr = Number(r.total_cents);
        const userCount = Number(r.user_count);
        return {
          month: r.month,
          mrr,
          arr: mrr * 12,
          arpu: userCount > 0 ? Math.round(mrr / userCount) : 0,
        };
      }),
    };
  }
}
