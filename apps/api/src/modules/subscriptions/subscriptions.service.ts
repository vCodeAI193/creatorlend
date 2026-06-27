import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Kontingent je Plan – steuert, wie viele Ausleihen pro Periode möglich sind. */
const PLAN_QUOTA: Record<string, number> = {
  STANDARD: 10,
  PREMIUM: 30,
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Startet ein Stripe-Checkout für ein Abo. In der Implementierung wird hier
   * eine Stripe-Checkout-Session erstellt; das eigentliche Anlegen des
   * Subscription-Datensatzes erfolgt über den Stripe-Webhook. Platzhalter:
   */
  async createCheckout(userId: string, plan: string) {
    void userId;
    return {
      checkoutUrl: `https://checkout.stripe.com/c/pay/PLACEHOLDER?plan=${plan}`,
      plan,
    };
  }

  async getForUser(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException("no_subscription");
    return sub;
  }

  async changePlan(userId: string, plan: string) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { plan, loanQuotaPerPeriod: PLAN_QUOTA[plan] ?? PLAN_QUOTA.STANDARD },
    });
  }

  async cancel(userId: string) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }
}
