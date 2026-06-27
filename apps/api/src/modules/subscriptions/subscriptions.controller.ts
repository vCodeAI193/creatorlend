import { Body, Controller, Delete, Get, Patch, Post, Req } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";

/** Abo-Verwaltung (Stripe Billing). */
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  // POST /api/v1/subscriptions – Abo abschließen (Checkout)
  @Post()
  create(@Req() req: { userId: string }, @Body() body: { plan: string }) {
    return this.subscriptions.createCheckout(req.userId, body.plan);
  }

  // GET /api/v1/subscriptions/me – aktuelles Abo
  @Get("me")
  me(@Req() req: { userId: string }) {
    return this.subscriptions.getForUser(req.userId);
  }

  // PATCH /api/v1/subscriptions/me – Plan wechseln
  @Patch("me")
  change(@Req() req: { userId: string }, @Body() body: { plan: string }) {
    return this.subscriptions.changePlan(req.userId, body.plan);
  }

  // DELETE /api/v1/subscriptions/me – zum Periodenende kündigen
  @Delete("me")
  cancel(@Req() req: { userId: string }) {
    return this.subscriptions.cancel(req.userId);
  }
}
