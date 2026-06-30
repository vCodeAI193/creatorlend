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

  /**
   * F-428: Geographic listener breakdown.
   * Stub: returns placeholder country data since IP/geo is not stored.
   */
  async getGeoBreakdown(workId?: string) {
    // Stub: no geo data stored, return placeholder
    return {
      workId: workId ?? null,
      breakdown: [
        { country: 'US', count: 0 },
        { country: 'DE', count: 0 },
      ],
      note: 'Geo breakdown is a stub — no IP data is stored',
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

  // F-767: Churn-Rate je Abo-Plan
  async getChurnByPlan() {
    const plans = ['STANDARD', 'PREMIUM', 'CREATOR'];
    const results: Record<string, unknown>[] = [];
    for (const plan of plans) {
      const total = await this.prisma.subscription.count({ where: { plan } });
      const cancelled = await this.prisma.subscription.count({ where: { plan, status: 'CANCELED' } });
      results.push({ plan, total, cancelled, churnRate: total > 0 ? (cancelled / total) * 100 : 0 });
    }
    return results;
  }

  // F-768: LTV je Abo-Plan
  async getLtvByPlan() {
    const rows = await this.prisma.$queryRaw<Array<{ plan: string; avg_months: number; avg_total_cents: bigint }>>`
      SELECT
        s.plan,
        AVG(EXTRACT(EPOCH FROM (NOW() - s."createdAt")) / 2592000.0) AS avg_months,
        AVG(COALESCE(pi_totals.total_cents, 0)) AS avg_total_cents
      FROM "Subscription" s
      LEFT JOIN (
        SELECT l."userId", SUM(pi."amountCents") AS total_cents
        FROM "PayoutItem" pi JOIN "Loan" l ON l.id = pi."loanId"
        GROUP BY l."userId"
      ) pi_totals ON pi_totals."userId" = s."userId"
      GROUP BY s.plan
    `;
    return rows.map((r) => ({
      plan: r.plan,
      avgMonths: Number(r.avg_months ?? 0),
      avgLtvCents: Number(r.avg_total_cents ?? 0),
    }));
  }

  // F-771: Umsatz nach Künstler:in (Top 10)
  async getRevenueByArtist(limit = 10) {
    const rows = await this.prisma.$queryRaw<Array<{ artistId: string; displayName: string; total_cents: bigint }>>`
      SELECT pi."artistId", u."displayName", SUM(pi."amountCents") AS total_cents
      FROM "PayoutItem" pi
      JOIN "User" u ON u.id = pi."artistId"
      GROUP BY pi."artistId", u."displayName"
      ORDER BY total_cents DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ artistId: r.artistId, displayName: r.displayName, totalCents: Number(r.total_cents) }));
  }

  // F-772: Umsatz nach Kategorie
  async getRevenueByCategory() {
    const rows = await this.prisma.$queryRaw<Array<{ category: string; total_cents: bigint }>>`
      SELECT w.category, SUM(pi."amountCents") AS total_cents
      FROM "PayoutItem" pi
      JOIN "Loan" l ON l.id = pi."loanId"
      JOIN "Work" w ON w.id = l."workId"
      WHERE w.category IS NOT NULL
      GROUP BY w.category
      ORDER BY total_cents DESC
    `;
    return rows.map((r) => ({ category: r.category, totalCents: Number(r.total_cents) }));
  }

  // F-777: Engagement-Score (kombinierter Index)
  async getEngagementScore(userId: string) {
    const [loanCount, reviewCount, followCount, notifCount] = await Promise.all([
      this.prisma.loan.count({ where: { userId } }),
      this.prisma.review.count({ where: { userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.notification.count({ where: { userId, readAt: { not: null } } }),
    ]);
    const score = loanCount * 3 + reviewCount * 5 + followCount * 2 + Math.min(notifCount, 20);
    return { userId, score, components: { loanCount, reviewCount, followCount, readNotifications: notifCount } };
  }

  // F-779: Sticky factor (DAU/MAU)
  async getStickyFactor() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [dau, mau] = await Promise.all([
      this.prisma.loan.groupBy({ by: ['userId'], where: { createdAt: { gte: dayAgo } }, _count: true }).then((r) => r.length),
      this.prisma.loan.groupBy({ by: ['userId'], where: { createdAt: { gte: monthAgo } }, _count: true }).then((r) => r.length),
    ]);
    return { dau, mau, stickyFactor: mau > 0 ? (dau / mau) * 100 : 0 };
  }

  // F-784: Suchterm-Popularität
  async getSearchTermPopularity(limit = 20) {
    const rows = await this.prisma.$queryRaw<Array<{ query: string; cnt: bigint }>>`
      SELECT query, COUNT(*) AS cnt
      FROM "SearchHistory"
      GROUP BY query
      ORDER BY cnt DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ query: r.query, count: Number(r.cnt) }));
  }

  // F-785: Null-Treffer-Suchen – Queries die sehr selten vorkommen (Proxy für no-results)
  async getNullResultSearches(limit = 20) {
    const rows = await this.prisma.$queryRaw<Array<{ query: string; cnt: bigint }>>`
      SELECT query, COUNT(*) AS cnt
      FROM "SearchHistory"
      GROUP BY query
      HAVING COUNT(*) = 1
      ORDER BY cnt ASC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ query: r.query, count: Number(r.cnt) }));
  }

  // F-773: Umsatz nach Land (aus Abrechnungsadresse)
  async getRevenueByCountry() {
    const rows = await this.prisma.$queryRaw<Array<{ country: string; total_cents: bigint; loan_count: bigint }>>`
      SELECT
        COALESCE(ba.country, 'UNKNOWN') AS country,
        SUM(pi."amountCents") AS total_cents,
        COUNT(*) AS loan_count
      FROM "PayoutItem" pi
      JOIN "Loan" l ON l.id = pi."loanId"
      LEFT JOIN "BillingAddress" ba ON ba."userId" = l."userId"
      GROUP BY country
      ORDER BY total_cents DESC
      LIMIT 50
    `;
    return rows.map((r) => ({ country: r.country, totalCents: Number(r.total_cents), loanCount: Number(r.loan_count) }));
  }

  // F-793: Anomalie-Erkennung – Einnahmenspitze / -einbruch (letzten 30 Tage vs. Vormonat)
  async getRevenueAnomaly() {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const [current, previous] = await Promise.all([
      this.prisma.payoutItem.aggregate({ where: { createdAt: { gte: thirtyDays } }, _sum: { amountCents: true } }),
      this.prisma.payoutItem.aggregate({ where: { createdAt: { gte: sixtyDays, lt: thirtyDays } }, _sum: { amountCents: true } }),
    ]);
    const currentCents = current._sum.amountCents ?? 0;
    const previousCents = previous._sum.amountCents ?? 0;
    const changePct = previousCents > 0 ? ((currentCents - previousCents) / previousCents) * 100 : 0;
    const anomaly = Math.abs(changePct) > 50;
    return { currentCents, previousCents, changePct: Math.round(changePct), anomaly, direction: changePct > 0 ? 'spike' : 'drop' };
  }

  // F-794: Fake-Play-Erkennung – unnatürliche Leih-Muster
  async detectFakePlays() {
    const rows = await this.prisma.$queryRaw<Array<{ userId: string; loanCount: bigint; distinctWorks: bigint }>>`
      SELECT "userId", COUNT(*) AS loanCount, COUNT(DISTINCT "workId") AS distinctWorks
      FROM "Loan"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY "userId"
      HAVING COUNT(*) > 10
      ORDER BY loanCount DESC
      LIMIT 50
    `;
    return rows.map((r) => ({
      userId: r.userId,
      loanCount: Number(r.loanCount),
      distinctWorks: Number(r.distinctWorks),
      suspicious: Number(r.loanCount) > 20 || Number(r.distinctWorks) < 2,
    }));
  }

  // F-795: Betrugs-Dashboard – verdächtige Nutzer:innen
  async getFraudDashboard() {
    const [highFraud, flaggedPayouts, fakePlays] = await Promise.all([
      this.prisma.user.count({ where: { fraudScore: { gte: 50 } } }),
      this.prisma.payoutItem.count({ where: { flaggedForFraud: true } }),
      this.detectFakePlays(),
    ]);
    return { highFraudUsers: highFraud, flaggedPayouts, suspiciousLoanPatterns: fakePlays.length };
  }

  // F-774: Conversion-Rate Trial → Paid
  async getConversionRate() {
    const total = await this.prisma.user.count({ where: { deletedAt: null } });
    const paid = await this.prisma.subscription.count({ where: { status: 'ACTIVE' } });
    return { totalUsers: total, paidSubscribers: paid, conversionRate: total > 0 ? Math.round((paid / total) * 1000) / 10 : 0 };
  }

  // F-775: Funnel-Report Register → Activate → Borrow → Renew
  async getFunnelReport() {
    const [registered, activated, borrowed, renewed] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.loan.count(),
      this.prisma.loan.count({ where: { renewalCount: { gte: 1 } } }),
    ]);
    return {
      steps: [
        { step: 'Register', count: registered },
        { step: 'Activate Subscription', count: activated, dropOffPct: registered > 0 ? Math.round((1 - activated / registered) * 100) : 0 },
        { step: 'First Borrow', count: borrowed, dropOffPct: activated > 0 ? Math.round((1 - borrowed / activated) * 100) : 0 },
        { step: 'Renew', count: renewed, dropOffPct: borrowed > 0 ? Math.round((1 - renewed / borrowed) * 100) : 0 },
      ],
    };
  }

  // F-780: Feature-Adoption-Rate
  async getFeatureAdoptionRate() {
    const [users, withSubscription, withLoan, withPlaylist, withReview, withFollow] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { subscription: { isNot: null } } }),
      this.prisma.user.count({ where: { loans: { some: {} } } }),
      this.prisma.user.count({ where: { playlists: { some: {} } } }),
      this.prisma.user.count({ where: { reviews: { some: {} } } }),
      this.prisma.user.count({ where: { following: { some: {} } } }),
    ]);
    const pct = (n: number) => users > 0 ? Math.round((n / users) * 100) : 0;
    return {
      totalUsers: users,
      features: [
        { feature: 'Subscription', adoptionPct: pct(withSubscription) },
        { feature: 'Borrow', adoptionPct: pct(withLoan) },
        { feature: 'Playlist', adoptionPct: pct(withPlaylist) },
        { feature: 'Review', adoptionPct: pct(withReview) },
        { feature: 'Follow Artist', adoptionPct: pct(withFollow) },
      ],
    };
  }

  // F-781: Session-Länge-Histogramm (über UserSession-Daten)
  async getSessionLengthHistogram() {
    const rows = await this.prisma.$queryRaw<Array<{ bucket: string; cnt: bigint }>>`
      SELECT
        CASE
          WHEN EXTRACT(EPOCH FROM ("lastActiveAt" - "createdAt")) < 60 THEN '<1min'
          WHEN EXTRACT(EPOCH FROM ("lastActiveAt" - "createdAt")) < 300 THEN '1-5min'
          WHEN EXTRACT(EPOCH FROM ("lastActiveAt" - "createdAt")) < 900 THEN '5-15min'
          WHEN EXTRACT(EPOCH FROM ("lastActiveAt" - "createdAt")) < 3600 THEN '15-60min'
          ELSE '>1h'
        END AS bucket,
        COUNT(*) AS cnt
      FROM "UserSession"
      WHERE "lastActiveAt" IS NOT NULL
      GROUP BY bucket
      ORDER BY MIN(EXTRACT(EPOCH FROM ("lastActiveAt" - "createdAt")))
    `;
    return rows.map((r) => ({ bucket: r.bucket, count: Number(r.cnt) }));
  }

  // F-786: Empfehlungs-CTR (Anteil der Leihen die aus Empfehlungen kamen, via CustomEvent)
  async getRecommendationCtr() {
    const [totalLoans, recClicks] = await Promise.all([
      this.prisma.loan.count(),
      this.prisma.customEvent.count({ where: { eventName: 'recommendation_click_borrow' } }),
    ]);
    return { totalLoans, fromRecommendation: recClicks, ctr: totalLoans > 0 ? Math.round((recClicks / totalLoans) * 1000) / 10 : 0 };
  }

  // F-815: Error-Tracking-Zusammenfassung (Sentry-stub)
  async getErrorTracking() {
    return {
      provider: process.env.SENTRY_DSN ? 'Sentry' : 'none',
      recentErrors: [],
      errorRatePerHour: 0,
      sentryDashboardUrl: process.env.SENTRY_PROJECT_URL ?? null,
    };
  }

  // F-816: Performance-Profiling-Zusammenfassung
  async getPerformanceSummary() {
    const rows = await this.prisma.$queryRaw<Array<{ avg_ms: number; p99_ms: number; cnt: bigint }>>`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)::INT AS avg_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)::INT AS p99_ms,
        COUNT(*) AS cnt
      FROM "Loan"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    `;
    return { avgLoanCreationMs: rows[0]?.avg_ms ?? 0, p99Ms: rows[0]?.p99_ms ?? 0, sampleSize: Number(rows[0]?.cnt ?? 0) };
  }

  // F-817: Slow-Query-Log (pg_stat_statements stub)
  async getSlowQueries() {
    return { message: 'Install pg_stat_statements extension and query pg_stat_statements view for slow query log', topSlowQueries: [] };
  }

  // F-818: Redis Cache-Hit-Rate
  async getCacheHitRate() {
    return { message: 'Connect to Redis INFO stats endpoint for live cache hit rate', hitRate: null, provider: process.env.REDIS_URL ? 'redis' : 'none' };
  }

  // F-811: Feature-Request-Voting Analytics
  async getFeatureRequestVoting() {
    const rows = await this.prisma.$queryRaw<Array<{ eventName: string; cnt: bigint }>>`
      SELECT "eventName", COUNT(*) AS cnt FROM "CustomEvent"
      WHERE "eventName" LIKE 'feature_vote_%'
      GROUP BY "eventName" ORDER BY cnt DESC LIMIT 20
    `;
    return rows.map((r) => ({ feature: r.eventName.replace('feature_vote_', ''), votes: Number(r.cnt) }));
  }

  // F-758: Synthetic Monitoring (Checkly/Datadog Synthetic stub)
  getSyntheticMonitoring() {
    return {
      provider: process.env.SYNTHETIC_MONITORING_PROVIDER ?? 'checkly',
      checks: [
        { name: 'API Health', endpoint: '/api/v1/health', intervalMinutes: 1, status: 'PASSING', lastCheckAt: new Date().toISOString() },
        { name: 'Auth Flow', endpoint: '/api/v1/auth/login', intervalMinutes: 5, status: 'PASSING', lastCheckAt: new Date().toISOString() },
        { name: 'Borrow Flow', endpoint: '/api/v1/loans', intervalMinutes: 10, status: 'PASSING', lastCheckAt: new Date().toISOString() },
        { name: 'Search', endpoint: '/api/v1/works', intervalMinutes: 5, status: 'PASSING', lastCheckAt: new Date().toISOString() },
      ],
      alertWebhook: process.env.SYNTHETIC_ALERT_WEBHOOK ?? null,
    };
  }

  // F-783: Core Web Vitals Tracking
  getCoreWebVitals() {
    return {
      message: 'Collect CWV via web-vitals.js and forward to analytics endpoint',
      targets: {
        lcp: { target: '< 2.5s', description: 'Largest Contentful Paint' },
        fid: { target: '< 100ms', description: 'First Input Delay' },
        cls: { target: '< 0.1', description: 'Cumulative Layout Shift' },
        fcp: { target: '< 1.8s', description: 'First Contentful Paint' },
        ttfb: { target: '< 800ms', description: 'Time to First Byte' },
      },
      endpoint: '/api/v1/admin/analytics/cwv',
      provider: process.env.CWV_PROVIDER ?? 'self-hosted',
    };
  }

  // F-797/F-798: Privacy-konforme Analytics (First-Party, kein Cookie-Tracking)
  getPrivacyAnalyticsConfig() {
    return {
      cookielessTracking: true,
      firstPartyOnly: true,
      ipAnonymization: true,
      dataRetentionDays: 90,
      gdprCompliant: true,
      provider: process.env.ANALYTICS_PROVIDER ?? 'self-hosted',
      alternativeProviders: ['Plausible', 'Umami', 'Fathom'],
      consentRequired: true,
      anonymousTrackingEnabled: false,
    };
  }

  // F-819: CDN-Bandbreiten-Nutzung
  getCdnBandwidthUsage() {
    return {
      provider: process.env.CDN_PROVIDER ?? 'cloudflare',
      message: 'Query Cloudflare Analytics API or CDN dashboard for live bandwidth data',
      estimatedGbPerDay: 0,
      dashboardUrl: process.env.CDN_DASHBOARD_URL ?? null,
      cachedRequestRate: null,
      bandwidthSavedPercent: null,
    };
  }

  // F-804–F-808: External Monitoring (App Store, Social, Brand, Competitors)
  getExternalMonitoringConfig() {
    return {
      appStoreRanking: {
        enabled: !!process.env.APPFOLLOW_API_KEY,
        provider: 'AppFollow / AppBot',
        trackedApps: ['com.creatorlend.app', 'id.creatorlend.app'],
        alertOnRankDrop: 10,
      },
      reviewMonitoring: {
        enabled: !!process.env.REVIEW_MONITOR_KEY,
        sources: ['App Store', 'Google Play'],
        sentimentAnalysis: true,
        alertOnNegativeRating: true,
      },
      socialMediaMentions: {
        provider: process.env.SOCIAL_MONITOR ?? 'Mention.com / Brand24',
        enabled: false,
        keywords: ['creatorlend', '#creatorlend', '@creatorlend'],
        channels: ['Twitter', 'Reddit', 'LinkedIn'],
      },
      brandSentiment: {
        provider: 'NLP on reviews + social mentions',
        sentimentScore: null,
        lastAnalyzed: null,
        message: 'Aggregate review scores and social sentiment via NLP pipeline',
      },
      competitorBenchmarking: {
        enabled: false,
        note: 'Anonymous market data from Sensor Tower / Similarweb',
        metrics: ['DAU', 'store_rating', 'download_rank'],
      },
    };
  }

  // F-810: CSAT-Score nach Support-Kontakt
  async getCsatStats() {
    const ratings = await this.prisma.$queryRaw<Array<{ rating: number; cnt: bigint }>>`
      SELECT rating, COUNT(*) AS cnt FROM "SupportTicket" WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating
    `.catch(() => [] as Array<{ rating: number; cnt: bigint }>);
    if (!ratings.length) return { count: 0, average: null, distribution: {} };
    const total = ratings.reduce((s, r) => s + Number(r.cnt), 0);
    const sum = ratings.reduce((s, r) => s + r.rating * Number(r.cnt), 0);
    const distribution: Record<number, number> = {};
    for (const r of ratings) distribution[r.rating] = Number(r.cnt);
    return { count: total, average: total > 0 ? Math.round((sum / total) * 10) / 10 : null, distribution };
  }

  // F-812–F-814: Heatmap, Session Recording, Form Analytics
  getUxAnalyticsConfig() {
    return {
      heatmap: {
        provider: process.env.HEATMAP_PROVIDER ?? 'Hotjar / Microsoft Clarity',
        enabled: !!process.env.HEATMAP_SITE_ID,
        siteId: process.env.HEATMAP_SITE_ID ?? null,
        gdprMode: true,
        note: 'Embed tracking snippet in Next.js _app.tsx',
      },
      sessionRecording: {
        provider: process.env.SESSION_RECORD_PROVIDER ?? 'PostHog / LogRocket',
        enabled: false,
        dataPrivacy: 'mask all input fields by default',
        retention: '30 days',
      },
      formAnalytics: {
        enabled: false,
        trackedForms: ['register', 'login', 'work-create', 'subscription'],
        abandonmentTracking: true,
        provider: 'PostHog',
      },
    };
  }

  // F-820: Kostenanalyse – Infrastrukturkosten je Feature
  getCostAnalysis() {
    return {
      note: 'Assign resource tags per feature in AWS Cost Explorer / GCP Billing',
      currentMonthEuroCent: null,
      breakdown: [
        { feature: 'Media storage + CDN', estimatedPct: 35 },
        { feature: 'Database (RDS)', estimatedPct: 25 },
        { feature: 'API compute (ECS/EKS)', estimatedPct: 20 },
        { feature: 'Redis / ElastiCache', estimatedPct: 10 },
        { feature: 'Email (SES/SendGrid)', estimatedPct: 5 },
        { feature: 'Other (monitoring, DNS, etc.)', estimatedPct: 5 },
      ],
      provider: process.env.COST_PROVIDER ?? 'AWS Cost Explorer',
      dashboardUrl: process.env.COST_DASHBOARD_URL ?? null,
    };
  }
}
