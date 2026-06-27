import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { PayoutsService } from "./payouts.service";

/** Vergütung & Auszahlungen für Künstler:innen. */
@Controller("payouts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ARTIST)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  // GET /api/v1/payouts/summary – aggregierte Vergütung
  @Get("summary")
  summary(@CurrentUser() userId: string) {
    return this.payouts.summary(userId);
  }

  // GET /api/v1/payouts/items – Einzelposten je Ausleihe
  @Get("items")
  items(
    @CurrentUser() userId: string,
    @Query("status") status?: string,
    @Query("page") page = "1",
  ) {
    return this.payouts.items(userId, status, Number(page));
  }

  // POST /api/v1/payouts/connect/onboard – Stripe-Connect-Onboarding starten
  @Post("connect/onboard")
  onboard(@CurrentUser() userId: string) {
    return this.payouts.startOnboarding(userId);
  }

  // POST /api/v1/payouts/withdraw – Auszahlung via Stripe Connect anstoßen
  @Post("withdraw")
  withdraw(@CurrentUser() userId: string) {
    return this.payouts.withdraw(userId);
  }
}
