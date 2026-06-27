import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import Stripe from "stripe";

/**
 * Dünner, konfigurierbarer Wrapper um das Stripe-SDK.
 *
 * Ist STRIPE_SECRET_KEY nicht gesetzt, gilt Stripe als deaktiviert
 * (isEnabled() === false) und die aufrufenden Services nutzen ihren
 * Dev-Fallback. So bleibt der Loop ohne Stripe-Keys lauffähig/testbar.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe?: Stripe;
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
      this.logger.log("Stripe aktiviert");
    } else {
      this.logger.warn("STRIPE_SECRET_KEY fehlt – Stripe deaktiviert (Dev-Fallback)");
    }
  }

  isEnabled(): boolean {
    return !!this.stripe;
  }

  private client(): Stripe {
    if (!this.stripe) throw new ServiceUnavailableException("stripe_not_configured");
    return this.stripe;
  }

  /** Erstellt eine Checkout-Session für ein Abo und liefert die URL. */
  async createCheckoutSession(params: {
    userId: string;
    plan: string;
    priceId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string | null }> {
    const session = await this.client().checkout.sessions.create({
      mode: "subscription",
      customer_email: params.customerEmail,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      metadata: { userId: params.userId, plan: params.plan },
      subscription_data: { metadata: { userId: params.userId, plan: params.plan } },
    });
    return { id: session.id, url: session.url };
  }

  /** Verifiziert die Webhook-Signatur und liefert das geprüfte Event. */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.client().webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /** Legt ein Connect-Express-Konto für Auszahlungen an, liefert die Account-ID. */
  async createConnectAccount(email: string): Promise<string> {
    const account = await this.client().accounts.create({
      type: "express",
      email,
      capabilities: { transfers: { requested: true } },
    });
    return account.id;
  }

  /** Onboarding-Link für ein Connect-Konto. */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    const link = await this.client().accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  /** Überweisung an ein Connect-Konto (Auszahlung), liefert die Transfer-ID. */
  async createTransfer(amountCents: number, currency: string, destination: string): Promise<string> {
    const transfer = await this.client().transfers.create({
      amount: amountCents,
      currency,
      destination,
    });
    return transfer.id;
  }
}
