import { Controller, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
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

  // GET /api/v1/payouts/export.csv – CSV-Export aller Posten (B-109)
  @Get("export.csv")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async exportCsv(@CurrentUser() userId: string, @Res() res: any) {
    const csv = await this.payouts.exportCsv(userId);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="payouts.csv"');
    res.send(csv);
  }

  // GET /api/v1/payouts/history – Ausleihen-Verlauf aggregiert (B-141)
  @Get("history")
  history(
    @CurrentUser() userId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy: "day" | "week" | "month" = "day",
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.payouts.history(userId, fromDate, toDate, groupBy);
  }
}
