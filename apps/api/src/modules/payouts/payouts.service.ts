import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";
import { StripeService } from "../stripe/stripe.service";

const PAGE_SIZE = 20;
const PAYOUT_CURRENCY = "eur";

@Injectable()
export class PayoutsService {
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
}
