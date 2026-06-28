import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from "@nestjs/common";
import { StripeService } from "../stripe/stripe.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { PrismaService } from "../../prisma/prisma.service";

interface RawBodyRequest {
  rawBody?: Buffer;
}

/**
 * Stripe-Webhook-Endpunkt. Kein JWT – die Authentizität wird über die
 * Stripe-Signatur (stripe-signature-Header) gegen das Webhook-Secret geprüft.
 * Erfordert den Raw-Body (in main.ts via rawBody: true aktiviert).
 * Webhook-Events werden dedupliziert (B-112): jedes evt_... wird nur einmal verarbeitet.
 */
@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly subscriptions: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /api/v1/webhooks/stripe
  @Post("stripe")
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest,
    @Headers("stripe-signature") signature?: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException("missing_signature_or_body");
    }
    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException("invalid_signature");
    }

    // B-112: Deduplizierung – Event bereits verarbeitet?
    const existing = await this.prisma.stripeWebhookEvent.findUnique({
      where: { id: event.id },
    });
    if (existing) {
      this.logger.debug(`Stripe-Event ${event.id} bereits verarbeitet – übersprungen.`);
      return { received: true, duplicate: true };
    }

    await this.subscriptions.handleStripeEvent(event);

    // Event als verarbeitet markieren
    await this.prisma.stripeWebhookEvent.create({
      data: { id: event.id, type: event.type },
    });

    return { received: true, duplicate: false };
  }
}
