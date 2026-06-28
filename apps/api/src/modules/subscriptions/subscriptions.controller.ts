import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { SubscriptionsService } from "./subscriptions.service";
import { PlanDto } from "./dto/plan.dto";

/** Abo-Verwaltung (Stripe Billing; Dev-Aktivierung ohne Stripe). */
@Controller("subscriptions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  // POST /api/v1/subscriptions – Abo abschließen (Stripe Checkout)
  @Post()
  create(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.createCheckout(userId, body.plan);
  }

  // POST /api/v1/subscriptions/activate – Dev-Aktivierung ohne Stripe
  @Post("activate")
  activate(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.activateDev(userId, body.plan);
  }

  // POST /api/v1/subscriptions/trial – kostenlose Testphase starten (B-086)
  @Post("trial")
  trial(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.startTrial(userId, body.plan);
  }

  // GET /api/v1/subscriptions/me – aktuelles Abo
  @Get("me")
  me(@CurrentUser() userId: string) {
    return this.subscriptions.getForUser(userId);
  }

  // PATCH /api/v1/subscriptions/me – Plan wechseln
  @Patch("me")
  change(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.changePlan(userId, body.plan);
  }

  // DELETE /api/v1/subscriptions/me – zum Periodenende kündigen
  @Delete("me")
  cancel(@CurrentUser() userId: string) {
    return this.subscriptions.cancel(userId);
  }

  // POST /api/v1/subscriptions/billing-portal – Stripe Billing Portal (B-091)
  @Post("billing-portal")
  billingPortal(@CurrentUser() userId: string) {
    return this.subscriptions.getBillingPortalUrl(userId);
  }
}
