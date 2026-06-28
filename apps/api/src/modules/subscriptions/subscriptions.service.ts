import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StripeService } from "../stripe/stripe.service";

/** Kontingent je Plan – steuert, wie viele Ausleihen pro Periode möglich sind. */
const PLAN_QUOTA: Record<string, number> = {
  LITE: 5,
  STANDARD: 10,
  PREMIUM: 30,
};

/** Stripe-Price-ID je Plan – wird zur Laufzeit aus der Umgebung gelesen. */
function priceIdFor(plan: string): string | undefined {
  if (plan === "PREMIUM") return process.env.STRIPE_PRICE_PREMIUM;
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

    return this.prisma.subscription.upsert({
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
    return this.prisma.subscription.update({
      where: { userId },
      data: { plan, loanQuotaPerPeriod: quota },
    });
  }

  async cancel(userId: string) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
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
}
