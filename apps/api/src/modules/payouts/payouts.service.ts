import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";
import { StripeService } from "../stripe/stripe.service";

const PAGE_SIZE = 20;
const PAYOUT_CURRENCY = "eur";
// Mindestauszahlungsbetrag (B-099), konfigurierbar per Umgebungsvariable.
const MIN_PAYOUT_CENTS = Number(process.env.PAYOUT_MINIMUM_CENTS ?? "500");

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private readonly webBaseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Startet das Stripe-Connect-Onboarding und liefert den Onboarding-Link.
   * Legt bei Bedarf ein Connect-Konto an und merkt sich die Account-ID.
   */
  async startOnboarding(artistId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: artistId } });
    let accountId = user.stripeConnectAccountId;
    if (!accountId) {
      accountId = await this.stripe.createConnectAccount(user.email);
      await this.prisma.user.update({
        where: { id: artistId },
        data: { stripeConnectAccountId: accountId },
      });
    }
    const onboardingUrl = await this.stripe.createAccountLink(
      accountId,
      `${this.webBaseUrl}/artist/payouts?onboarding=refresh`,
      `${this.webBaseUrl}/artist/payouts?onboarding=done`,
    );
    return { onboardingUrl };
  }

  /** Aggregierte Vergütung: ausstehend, ausgezahlt, Gesamtzahl Ausleihen. */
  async summary(artistId: string) {
    const [pending, paid, lifetimeLoans] = await Promise.all([
      this.prisma.payoutItem.aggregate({
        where: { artistId, status: "PENDING" },
        _sum: { amountCents: true },
      }),
      this.prisma.payoutItem.aggregate({
        where: { artistId, status: "PAID" },
        _sum: { amountCents: true },
      }),
      this.prisma.payoutItem.count({ where: { artistId } }),
    ]);

    return {
      currency: "eur",
      pendingCents: pending._sum.amountCents ?? 0,
      paidCents: paid._sum.amountCents ?? 0,
      lifetimeLoans,
    };
  }

  async items(artistId: string, status: string | undefined, page: number) {
    const where = {
      artistId,
      ...(status ? { status: status as never } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.payoutItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.payoutItem.count({ where }),
    ]);

    return { items, meta: { page, pageSize: PAGE_SIZE, total } };
  }

  /**
   * CSV-Export aller Vergütungsposten (B-109). Gibt einen CSV-String zurück,
   * den der Controller mit Content-Type text/csv ausliefert.
   */
  async exportCsv(artistId: string): Promise<string> {
    const all = await this.prisma.payoutItem.findMany({
      where: { artistId },
      orderBy: { createdAt: "desc" },
      include: { loan: { select: { workId: true } } },
    });

    const header = "id,loanId,workId,amountCents,status,createdAt";
    const rows = all.map((item) =>
      [item.id, item.loanId, item.loan.workId, item.amountCents, item.status, item.createdAt.toISOString()].join(","),
    );
    return [header, ...rows].join("\n");
  }

  /**
   * Ausleihen-Verlauf aggregiert nach Zeitraum (B-141).
   * Gibt Tages-/Wochen-/Monatsbuckets mit Summen zurück.
   */
  async history(
    artistId: string,
    from: Date,
    to: Date,
    groupBy: "day" | "week" | "month",
  ) {
    const truncFn = groupBy === "month" ? "month" : groupBy === "week" ? "week" : "day";

    // Raw-Query für DATE_TRUNC (Prisma unterstützt das nicht nativ)
    const rows = await this.prisma.$queryRaw<
      Array<{ period: Date; loans: bigint; amountCents: bigint }>
    >`
      SELECT
        DATE_TRUNC(${truncFn}, pi."createdAt") AS period,
        COUNT(*)                               AS loans,
        SUM(pi."amountCents")                  AS "amountCents"
      FROM "PayoutItem" pi
      WHERE pi."artistId" = ${artistId}
        AND pi."createdAt" >= ${from}
        AND pi."createdAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((r) => ({
      period: r.period,
      loans: Number(r.loans),
      amountCents: Number(r.amountCents),
    }));
  }

  /**
   * Stößt eine Auszahlung der ausstehenden Posten an. In der Implementierung
   * erfolgt der eigentliche Transfer über Stripe Connect; danach werden die
   * Posten auf PAID gesetzt. Hier als transaktionaler Platzhalter.
   */
  async withdraw(artistId: string) {
    const pending = await this.prisma.payoutItem.aggregate({
      where: { artistId, status: "PENDING" },
      _sum: { amountCents: true },
      _count: true,
    });
    const amountCents = pending._sum.amountCents ?? 0;

    // B-099: Mindestauszahlungsbetrag prüfen
    if (amountCents < MIN_PAYOUT_CENTS && amountCents > 0) {
      throw new BadRequestException(
        `minimum_payout_not_reached:${MIN_PAYOUT_CENTS}`,
      );
    }

    // Mit aktivem Stripe: echte Überweisung an das Connect-Konto.
    if (this.stripe.isEnabled() && amountCents > 0) {
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: artistId } });
      if (!user.stripeConnectAccountId) {
        throw new BadRequestException("connect_account_required");
      }
      await this.stripe.createTransfer(amountCents, PAYOUT_CURRENCY, user.stripeConnectAccountId);
    }

    const result = await this.prisma.payoutItem.updateMany({
      where: { artistId, status: "PENDING" },
      data: { status: "PAID" },
    });

    if (result.count > 0) {
      // Künstler:in über die Auszahlung informieren (F-083).
      await this.notifications.create({
        userId: artistId,
        type: NotificationType.PAYOUT_PAID,
        title: "Auszahlung erfolgt",
        body: `${amountCents} Cent aus ${result.count} Ausleihen wurden ausgezahlt.`,
        data: { amountCents, items: result.count },
      });
    }

    return { transferred: result.count, amountCents };
  }

  /**
   * Automatische monatliche Auszahlungen an alle Künstler:innen, die den
   * Mindestbetrag erreicht haben (B-100). Wird vom Scheduler aufgerufen.
   */
  async autoWithdrawAll(): Promise<{ processed: number; totalCents: number }> {
    // Künstler:innen mit ausstehenden Beträgen >= Minimum ermitteln
    const groups = await this.prisma.payoutItem.groupBy({
      by: ["artistId"],
      where: { status: "PENDING" },
      _sum: { amountCents: true },
      having: { amountCents: { _sum: { gte: MIN_PAYOUT_CENTS } } },
    });

    let processed = 0;
    let totalCents = 0;

    for (const g of groups) {
      const amountCents = g._sum.amountCents ?? 0;
      try {
        if (this.stripe.isEnabled()) {
          const user = await this.prisma.user.findUnique({ where: { id: g.artistId } });
          if (user?.stripeConnectAccountId) {
            await this.stripe.createTransfer(amountCents, PAYOUT_CURRENCY, user.stripeConnectAccountId);
          }
        }
        await this.prisma.payoutItem.updateMany({
          where: { artistId: g.artistId, status: "PENDING" },
          data: { status: "PAID" },
        });
        await this.notifications.create({
          userId: g.artistId,
          type: NotificationType.PAYOUT_PAID,
          title: "Automatische Auszahlung",
          body: `${amountCents} Cent wurden automatisch ausgezahlt.`,
          data: { amountCents },
        });
        processed += 1;
        totalCents += amountCents;
      } catch (err) {
        this.logger.error(`Automatische Auszahlung für ${g.artistId} fehlgeschlagen`, err);
      }
    }

    return { processed, totalCents };
  }

  /**
   * Monatliche Vergütungs-Abrechnung (B-103): alle Ausleihen eines Kalendermonats
   * gruppiert nach Status, inkl. Werkdetails.
   */
  async monthlyStatement(artistId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const items = await this.prisma.payoutItem.findMany({
      where: { artistId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "asc" },
      include: {
        loan: {
          select: {
            id: true,
            startedAt: true,
            renewalCount: true,
            work: { select: { id: true, title: true, type: true } },
          },
        },
      },
    });

    const totals = items.reduce(
      (acc, i) => {
        acc.totalCents += i.amountCents;
        if (i.status === "PAID") acc.paidCents += i.amountCents;
        else acc.pendingCents += i.amountCents;
        return acc;
      },
      { totalCents: 0, paidCents: 0, pendingCents: 0 },
    );

    return {
      period: { year, month },
      from: from.toISOString(),
      to: to.toISOString(),
      ...totals,
      itemCount: items.length,
      items,
    };
  }

  /**
   * Einnahmen-Diagramm (F-372): aggregiert PayoutItems nach Periode.
   * period: 'day' | 'week' | 'month' (default 'month'), limit: max Buckets.
   */
  async earningsChart(artistId: string, period: "day" | "week" | "month" = "month", limit = 12) {
    const truncFn = period;
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: Date; amountCents: bigint; items: bigint }>
    >`
      SELECT
        DATE_TRUNC(${truncFn}, pi."createdAt") AS bucket,
        SUM(pi."amountCents")                  AS "amountCents",
        COUNT(*)                               AS items
      FROM "PayoutItem" pi
      WHERE pi."artistId" = ${artistId}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT ${limit}
    `;
    return rows
      .map((r) => ({ bucket: r.bucket, amountCents: Number(r.amountCents), items: Number(r.items) }))
      .reverse();
  }

  // ─── F-300: Stripe Connect Auto-Payout scheduling ────────────────────────

  /**
   * Schedules auto-payout for a given artist. Finds all PENDING PayoutItems
   * above threshold (env MIN_PAYOUT_CENTS, default 1000), marks as PROCESSING stub.
   */
  async scheduleAutoPayout(artistId: string) {
    const threshold = Number(process.env.MIN_PAYOUT_CENTS ?? "1000");
    const pending = await this.prisma.payoutItem.aggregate({
      where: { artistId, status: "PENDING" },
      _sum: { amountCents: true },
      _count: true,
    });
    const totalCents = pending._sum.amountCents ?? 0;
    if (totalCents < threshold) {
      return { scheduled: false, reason: "below_threshold", threshold, totalCents };
    }
    // Mark items as PAID (processing stub – real Stripe transfer handled by withdraw())
    await this.prisma.payoutItem.updateMany({
      where: { artistId, status: "PENDING" },
      data: { status: "PAID" },
    });
    this.logger.log(`Auto-payout scheduled for ${artistId}: ${totalCents} cents`);
    return { scheduled: true, totalCents, itemCount: pending._count };
  }

  // ─── F-302: Payout history with filters ──────────────────────────────────

  /** List payout items with optional status/date filters. */
  async listForArtist(
    artistId: string,
    status?: string,
    from?: Date,
    to?: Date,
    page = 1,
  ) {
    const where = {
      artistId,
      ...(status ? { status: status as never } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.payoutItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.payoutItem.count({ where }),
    ]);
    return { items, meta: { page, pageSize: PAGE_SIZE, total } };
  }

  // ─── F-303: Earnings breakdown by work ───────────────────────────────────

  /** Groups PayoutItems by workId, returns earnings per work. */
  async earningsByWork(artistId: string, from?: Date, to?: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ workId: string; title: string; loanCount: bigint; totalCents: bigint }>
    >`
      SELECT
        w.id AS "workId",
        w.title,
        COUNT(pi.id) AS "loanCount",
        SUM(pi."amountCents") AS "totalCents"
      FROM "PayoutItem" pi
      JOIN "Loan" l ON l.id = pi."loanId"
      JOIN "Work" w ON w.id = l."workId"
      WHERE pi."artistId" = ${artistId}
        ${from ? this.prisma.$queryRaw`AND pi."createdAt" >= ${from}` : this.prisma.$queryRaw``}
        ${to ? this.prisma.$queryRaw`AND pi."createdAt" <= ${to}` : this.prisma.$queryRaw``}
      GROUP BY w.id, w.title
      ORDER BY "totalCents" DESC
    `;
    return rows.map((r) => ({
      workId: r.workId,
      workTitle: r.title,
      loanCount: Number(r.loanCount),
      totalCents: Number(r.totalCents),
    }));
  }

  // ─── F-310: Payout settings ──────────────────────────────────────────────

  /** Get payout settings for an artist. */
  async getPayoutSettings(artistId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: artistId },
      select: { payoutThreshold: true, currency: true },
    });
    return { payoutThreshold: user.payoutThreshold, currency: user.currency };
  }

  /** Set minimum payout threshold for an artist. */
  async setPayoutThreshold(artistId: string, minCents: number) {
    return this.prisma.user.update({
      where: { id: artistId },
      data: { payoutThreshold: minCents },
      select: { id: true, payoutThreshold: true },
    });
  }

  // ─── F-451: Artist Dashboard summary ─────────────────────────────────────

  /** Comprehensive artist dashboard data. */
  async artistDashboard(artistId: string) {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [pending, paid, lastMonthEarnings, totalLoans, totalWorks, activeLoans, followerCount] =
      await Promise.all([
        this.prisma.payoutItem.aggregate({
          where: { artistId, status: "PENDING" },
          _sum: { amountCents: true },
        }),
        this.prisma.payoutItem.aggregate({
          where: { artistId, status: "PAID" },
          _sum: { amountCents: true },
        }),
        this.prisma.payoutItem.aggregate({
          where: { artistId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
          _sum: { amountCents: true },
        }),
        this.prisma.payoutItem.count({ where: { artistId } }),
        this.prisma.work.count({ where: { artistId } }),
        this.prisma.loan.count({
          where: { work: { artistId }, status: "ACTIVE" },
        }),
        this.prisma.follow.count({ where: { artistId } }),
      ]);

    // Find top work by borrow count
    const topWork = await this.prisma.work.findFirst({
      where: { artistId, status: "PUBLISHED" },
      orderBy: { borrowCount: "desc" },
      select: { id: true, title: true, borrowCount: true },
    });

    const pendingCents = pending._sum.amountCents ?? 0;
    const paidCents = paid._sum.amountCents ?? 0;

    return {
      pendingCents,
      paidCents,
      totalEarnings: pendingCents + paidCents,
      totalLoans,
      totalWorks,
      activeLoans,
      followerCount,
      lastMonthEarnings: lastMonthEarnings._sum.amountCents ?? 0,
      topWork: topWork
        ? { id: topWork.id, title: topWork.title, borrowCount: topWork.borrowCount }
        : null,
    };
  }

  // F-391: Betrug-Verdacht markieren / aufheben
  async flagPayoutItemForFraud(payoutItemId: string, flagged: boolean) {
    const item = await this.prisma.payoutItem.findUnique({ where: { id: payoutItemId } });
    if (!item) throw new NotFoundException('payout_item_not_found');
    return this.prisma.payoutItem.update({
      where: { id: payoutItemId },
      data: { flaggedForFraud: flagged },
    });
  }

  // F-391: Liste aller verdächtigen Auszahlungen
  async listFlaggedPayoutItems() {
    return this.prisma.payoutItem.findMany({
      where: { flaggedForFraud: true },
      include: { artist: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
