import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StripeService } from "../stripe/stripe.service";

/** Kontingent je Plan – steuert, wie viele Ausleihen pro Periode möglich sind. */
const PLAN_QUOTA: Record<string, number> = {
  LITE: 5,
  STANDARD: 10,
  PREMIUM: 30,
  ANNUAL: 120, // B-093
};

/** Stripe-Price-ID je Plan – wird zur Laufzeit aus der Umgebung gelesen. */
function priceIdFor(plan: string): string | undefined {
  if (plan === "PREMIUM") return process.env.STRIPE_PRICE_PREMIUM;
  if (plan === "ANNUAL") return process.env.STRIPE_PRICE_ANNUAL; // B-093
  return process.env.STRIPE_PRICE_STANDARD;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly webBaseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Startet ein Abo. Mit konfiguriertem Stripe wird eine echte Checkout-
   * Session erstellt; der Subscription-Datensatz wird dann über den Webhook
   * (checkout.session.completed) aktiviert. Ohne Stripe greift der Dev-Pfad.
   */
  async createCheckout(userId: string, plan: string) {
    if (!this.stripe.isEnabled()) {
      return {
        checkoutUrl: `https://checkout.stripe.com/c/pay/DEV_PLACEHOLDER?plan=${plan}`,
        plan,
        mode: "dev",
      };
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const priceId = priceIdFor(plan);
    if (!priceId) throw new NotFoundException("unknown_plan_price");

    const session = await this.stripe.createCheckoutSession({
      userId,
      plan,
      priceId,
      customerEmail: user.email,
      successUrl: `${this.webBaseUrl}/account?checkout=success`,
      cancelUrl: `${this.webBaseUrl}/account?checkout=cancelled`,
    });
    return { checkoutUrl: session.url, plan, mode: "stripe" };
  }

  /**
   * Dev-/Test-Aktivierung eines Abos OHNE Stripe. Macht den Kern-Loop sofort
   * lauffähig. In Produktion deaktiviert.
   */
  async activateDev(userId: string, plan: string) {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("dev_activation_disabled");
    }
    const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.STANDARD;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: "ACTIVE",
        loanQuotaPerPeriod: quota,
        loansUsedThisPeriod: 0,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan,
        status: "ACTIVE",
        loanQuotaPerPeriod: quota,
        loansUsedThisPeriod: 0,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
    await this.recordEvent(userId, "CREATED", plan);
    return sub;
  }

  async getForUser(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException("no_subscription");
    // B-080: verbleibende Ausleihen direkt zurückgeben
    return {
      ...sub,
      loansRemaining: Math.max(0, sub.loanQuotaPerPeriod - sub.loansUsedThisPeriod),
    };
  }

  /**
   * Kostenlose Testphase starten (B-086). Dev-Endpoint; in Prod via Stripe.
   */
  async startTrial(userId: string, plan: string, trialDays = 14) {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("trial_via_stripe_in_production");
    }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.STANDARD;
    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status: "ACTIVE", loanQuotaPerPeriod: quota, loansUsedThisPeriod: 0, currentPeriodEnd: trialEndsAt, trialEndsAt },
      update: { plan, status: "ACTIVE", loanQuotaPerPeriod: quota, loansUsedThisPeriod: 0, currentPeriodEnd: trialEndsAt, trialEndsAt, cancelAtPeriodEnd: false },
    });
  }

  async changePlan(userId: string, plan: string) {
    const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.STANDARD;
    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { plan, loanQuotaPerPeriod: quota },
    });
    await this.recordEvent(userId, "CHANGED", plan);
    return sub;
  }

  async cancel(userId: string) {
    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
    await this.recordEvent(userId, "CANCELED", sub.plan);
    return sub;
  }

  /**
   * Stripe-Billing-Portal-URL (B-091): Nutzer:in kann dort Zahlungsmethoden
   * verwalten, Abo kündigen und Rechnungen einsehen.
   */
  async getBillingPortalUrl(userId: string) {
    if (!this.stripe.isEnabled()) {
      return { portalUrl: null, mode: "dev" };
    }
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      return { portalUrl: null, mode: "no_stripe_customer" };
    }
    const returnUrl = `${this.webBaseUrl}/account`;
    const url = await this.stripe.createBillingPortalSession(sub.stripeCustomerId, returnUrl);
    return { portalUrl: url, mode: "stripe" };
  }

  /** Abo-Ereignis in der Historie aufzeichnen (B-090). */
  private async recordEvent(userId: string, event: string, plan?: string, amountCents?: number, meta?: object) {
    await this.prisma.subscriptionEvent.create({
      data: { userId, event, plan, amountCents, meta },
    });
  }

  /** Abrechnungshistorie für den Nutzer (B-090). */
  async getBillingHistory(userId: string, page = 1) {
    const PAGE_SIZE = 20;
    const [events, total] = await Promise.all([
      this.prisma.subscriptionEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.subscriptionEvent.count({ where: { userId } }),
    ]);
    return { events, meta: { page, pageSize: PAGE_SIZE, total } };
  }

  /** Stripe-Abo-Status auf das interne Enum abbilden. */
  private mapStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case "active":
      case "trialing":
        return "ACTIVE";
      case "past_due":
      case "unpaid":
        return "PAST_DUE";
      default:
        return "CANCELED";
    }
  }

  /**
   * Verarbeitet verifizierte Stripe-Webhook-Events für den Abo-Lebenszyklus.
   */
  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;
        const plan = session.metadata?.plan ?? "STANDARD";
        if (!userId) break;
        const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.STANDARD;
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);
        await this.prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: "ACTIVE",
            loanQuotaPerPeriod: quota,
            loansUsedThisPeriod: 0,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : undefined,
            currentPeriodEnd: periodEnd,
          },
          update: {
            plan,
            status: "ACTIVE",
            loanQuotaPerPeriod: quota,
            loansUsedThisPeriod: 0,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : undefined,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status =
          event.type === "customer.subscription.deleted"
            ? "CANCELED"
            : this.mapStatus(sub.status);
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : undefined,
          },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : undefined;
        if (!subId) break;
        // Neue Abrechnungsperiode: Kontingent zurücksetzen, Abo aktiv halten.
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data: { status: "ACTIVE", loansUsedThisPeriod: 0 },
        });
        break;
      }

      default:
        this.logger.debug(`Unbehandeltes Stripe-Event: ${event.type}`);
    }
  }

  /**
   * Abo pausieren (F-529): legt einen SubscriptionPause-Datensatz an und
   * setzt das Abo auf PAUSED. Automatisches Fortsetzen nach resumeInDays Tagen.
   */
  async pauseSubscription(userId: string, resumeInDays = 30) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException("no_subscription");
    if (sub.status !== "ACTIVE") throw new BadRequestException("subscription_not_active");
    const resumeAt = new Date(Date.now() + resumeInDays * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.subscription.update({ where: { userId }, data: { status: "PAUSED" as never } }),
      this.prisma.subscriptionPause.create({ data: { userId, resumeAt } }),
    ]);
    await this.recordEvent(userId, "PAUSED", sub.plan);
    return { paused: true, resumeAt };
  }

  /**
   * Abo manuell fortsetzen (F-529): markiert offene Pause als erledigt
   * und setzt das Abo auf ACTIVE.
   */
  async resumeSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException("no_subscription");
    const pause = await this.prisma.subscriptionPause.findFirst({
      where: { userId, resumedAt: null },
    });
    await this.prisma.$transaction([
      this.prisma.subscription.update({ where: { userId }, data: { status: "ACTIVE" } }),
      ...(pause
        ? [this.prisma.subscriptionPause.update({ where: { id: pause.id }, data: { resumedAt: new Date() } })]
        : []),
    ]);
    await this.recordEvent(userId, "RESUMED", sub.plan);
    return { resumed: true };
  }

  async purchaseAddon(userId: string, extraLoans: number) {
    const amountCents = extraLoans * 99; // 99 cents per extra loan slot (MVP pricing)
    const addon = await this.prisma.loanAddon.create({
      data: { userId, extraLoans, amountCents, status: 'ACTIVE' },
    });
    await this.prisma.subscription.update({
      where: { userId },
      data: { loanQuotaPerPeriod: { increment: extraLoans } },
    });
    return addon;
  }

  async listAddons(userId: string) {
    return this.prisma.loanAddon.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── F-501: Plan definitions ──────────────────────────────────────────────

  /** F-501: Return available subscription plan definitions. */
  getPlans() {
    return [
      { id: "BASIC", name: "Basic", loanQuota: 5, priceCents: 499 },
      { id: "STANDARD", name: "Standard", loanQuota: 10, priceCents: 999 },
      { id: "PREMIUM", name: "Premium", loanQuota: 30, priceCents: 1499 },
    ];
  }

  // ─── F-502: Cancel subscription ──────────────────────────────────────────

  /** F-502: Cancel subscription (sets cancelAtPeriodEnd=true). */
  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
    await this.recordEvent(userId, "CANCEL_REQUESTED", sub.plan);
    // Stub: send cancellation email notification
    this.logger.log(`Cancellation requested for user ${userId}`);
    return { cancelAtPeriodEnd: true, currentPeriodEnd: sub.currentPeriodEnd };
  }

  // ─── F-503: Reactivate subscription ──────────────────────────────────────

  /** F-503: Reactivate subscription (sets cancelAtPeriodEnd=false). */
  async reactivate(userId: string) {
    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: false },
    });
    await this.recordEvent(userId, "REACTIVATED", sub.plan);
    return { reactivated: true, plan: sub.plan };
  }

  // ─── F-510: Dunning retry failed payments ─────────────────────────────────

  /** F-510: Retry failed payments for PAST_DUE subscriptions. */
  async retryFailedPayments(): Promise<{ processed: number }> {
    const pastDue = await this.prisma.subscription.findMany({
      where: { status: "PAST_DUE" },
      select: { userId: true, plan: true },
    });
    let processed = 0;
    for (const sub of pastDue) {
      try {
        // Stub: simulate retry (no real Stripe call in MVP)
        this.logger.log(`[Dunning] Retrying payment for user ${sub.userId}`);
        processed += 1;
      } catch (err) {
        this.logger.error(`[Dunning] Retry failed for ${sub.userId}`, err);
      }
    }
    return { processed };
  }

  /**
   * F-351: Rollover quota for a single subscription – resets loansUsedThisPeriod
   * and sets currentPeriodEnd to now + 30 days.
   */
  async rolloverQuota(subscriptionId: string) {
    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { loansUsedThisPeriod: 0, currentPeriodEnd: nextPeriodEnd },
    });
  }

  /**
   * Alle fälligen pausierten Abos automatisch wieder aktivieren.
   * Wird stündlich vom Scheduler aufgerufen.
   */
  async autoResumePaused(): Promise<{ resumed: number }> {
    const now = new Date();
    const duePauses = await this.prisma.subscriptionPause.findMany({
      where: { resumeAt: { lte: now }, resumedAt: null },
      select: { id: true, userId: true },
    });
    if (duePauses.length === 0) return { resumed: 0 };
    for (const p of duePauses) {
      await this.prisma.$transaction([
        this.prisma.subscription.update({ where: { userId: p.userId }, data: { status: "ACTIVE" } }),
        this.prisma.subscriptionPause.update({ where: { id: p.id }, data: { resumedAt: now } }),
      ]);
    }
    return { resumed: duePauses.length };
  }
}
