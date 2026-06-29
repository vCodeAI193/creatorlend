import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { PayoutsService } from "./payouts.service";
import { TipsService } from "./tips.service";
import { TaxStatementService } from "./tax-statement.service";

/** Vergütung & Auszahlungen für Künstler:innen. */
@Controller("payouts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ARTIST)
export class PayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly tips: TipsService,
    private readonly taxStatement: TaxStatementService,
  ) {}

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

  // GET /api/v1/payouts/statement?year=2026&month=1 – Monatsabrechnung (B-103)
  @Get("statement")
  statement(
    @CurrentUser() userId: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    const now = new Date();
    return this.payouts.monthlyStatement(
      userId,
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }

  // GET /api/v1/payouts/chart?period=month&limit=12 – Einnahmen-Diagramm (F-372)
  @Get("chart")
  earningsChart(
    @CurrentUser() userId: string,
    @Query("period") period: "day" | "week" | "month" = "month",
    @Query("limit") limit = "12",
  ) {
    return this.payouts.earningsChart(userId, period, Number(limit));
  }

  // POST /api/v1/payouts/tip – Trinkgeld an Künstler:in senden (F-323)
  @Post("tip")
  @Roles(UserRole.LISTENER)
  sendTip(
    @CurrentUser() userId: string,
    @Body("artistId") artistId: string,
    @Body("amountCents") amountCents: number,
    @Body("workId") workId?: string,
    @Body("message") message?: string,
  ) {
    return this.tips.sendTip(userId, artistId, amountCents, workId, message);
  }

  // GET /api/v1/payouts/tips – eingegangene Trinkgelder (F-323)
  @Get("tips")
  receivedTips(@CurrentUser() userId: string) {
    return this.tips.receivedTips(userId);
  }

  // GET /api/v1/payouts/tips/:artistId – Trinkgelder für bestimmten Künstler
  @Get("tips/:artistId")
  tipsByArtist(@Param("artistId") artistId: string) {
    return this.tips.receivedTips(artistId);
  }

  // GET /api/v1/payouts/tax-statement – Jahressteuererklärung (F-368)
  @Get("tax-statement")
  getTaxStatement(@CurrentUser() userId: string, @Query("year") year?: string) {
    return this.taxStatement.generate(userId, year ? Number(year) : new Date().getFullYear());
  }

  // GET /api/v1/payouts/tax-statement/years – verfügbare Jahre (F-368)
  @Get("tax-statement/years")
  getTaxStatementYears(@CurrentUser() userId: string) {
    return this.taxStatement.listAvailableYears(userId);
  }
}
