import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { StripeService } from "../stripe/stripe.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

interface RawBodyRequest {
  rawBody?: Buffer;
}

/**
 * Stripe-Webhook-Endpunkt. Kein JWT – die Authentizität wird über die
 * Stripe-Signatur (stripe-signature-Header) gegen das Webhook-Secret geprüft.
 * Erfordert den Raw-Body (in main.ts via rawBody: true aktiviert).
 */
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly stripe: StripeService,
    private readonly subscriptions: SubscriptionsService,
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
    await this.subscriptions.handleStripeEvent(event);
    return { received: true };
  }
}
