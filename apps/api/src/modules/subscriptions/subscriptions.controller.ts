import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { SubscriptionsService } from "./subscriptions.service";
import { GiftCodesService } from "./gift-codes.service";
import { PlanDto } from "./dto/plan.dto";

/** Abo-Verwaltung (Stripe Billing; Dev-Aktivierung ohne Stripe). */
@Controller("subscriptions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly giftCodes: GiftCodesService,
  ) {}

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

  // GET /api/v1/subscriptions/billing-history – Abrechnungshistorie (B-090)
  @Get("billing-history")
  billingHistory(@CurrentUser() userId: string, @Query("page") page = "1") {
    return this.subscriptions.getBillingHistory(userId, Number(page));
  }

  // POST /api/v1/subscriptions/me/pause – Abo pausieren (F-529)
  @Post("me/pause")
  pause(
    @CurrentUser() userId: string,
    @Body("resumeInDays") resumeInDays?: number,
  ) {
    return this.subscriptions.pauseSubscription(userId, resumeInDays);
  }

  // POST /api/v1/subscriptions/me/resume – Abo fortsetzen (F-529)
  @Post("me/resume")
  resume(@CurrentUser() userId: string) {
    return this.subscriptions.resumeSubscription(userId);
  }

  // POST /api/v1/subscriptions/gift – Geschenk-Code erstellen (F-239)
  @Post("gift")
  createGiftCode(
    @CurrentUser() userId: string,
    @Body()
    body: {
      planId: string;
      durationDays?: number;
      recipientEmail?: string;
      expiresAt?: string;
    },
  ) {
    return this.giftCodes.createGiftCode(
      userId,
      body.planId,
      body.durationDays ?? 30,
      body.recipientEmail,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  // POST /api/v1/subscriptions/gift/redeem – Geschenk-Code einlösen (F-240)
  @Post("gift/redeem")
  @HttpCode(200)
  redeemGiftCode(
    @CurrentUser() userId: string,
    @Body("code") code: string,
  ) {
    return this.giftCodes.redeemGiftCode(userId, code);
  }
}
