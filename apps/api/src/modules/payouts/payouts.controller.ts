import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { PayoutsService } from "./payouts.service";
import { TipsService } from "./tips.service";
import { TaxStatementService } from "./tax-statement.service";
import { InvoiceService } from "./invoice.service";

/** Vergütung & Auszahlungen für Künstler:innen. */
@Controller("payouts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ARTIST)
export class PayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly tips: TipsService,
    private readonly taxStatement: TaxStatementService,
    private readonly invoice: InvoiceService,
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

  // GET /api/v1/payouts – payout history with filters (F-302)
  @Get()
  listPayouts(
    @CurrentUser() userId: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page = "1",
  ) {
    return this.payouts.listForArtist(
      userId,
      status,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      Number(page),
    );
  }

  // GET /api/v1/payouts/by-work – earnings breakdown per work (F-303)
  @Get("by-work")
  earningsByWork(
    @CurrentUser() userId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.payouts.earningsByWork(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  // GET /api/v1/payouts/settings – payout settings (F-310)
  @Get("settings")
  getPayoutSettings(@CurrentUser() userId: string) {
    return this.payouts.getPayoutSettings(userId);
  }

  // PATCH /api/v1/payouts/settings – update payout threshold (F-310)
  @Patch("settings")
  setPayoutThreshold(
    @CurrentUser() userId: string,
    @Body("minCents") minCents: number,
  ) {
    return this.payouts.setPayoutThreshold(userId, minCents);
  }

  // POST /api/v1/payouts/auto-payout – schedule auto-payout (F-300)
  @Post("auto-payout")
  scheduleAutoPayout(@CurrentUser() userId: string) {
    return this.payouts.scheduleAutoPayout(userId);
  }

  // GET /api/v1/payouts/dashboard – artist dashboard summary (F-451)
  @Get("dashboard")
  artistDashboard(@CurrentUser() userId: string) {
    return this.payouts.artistDashboard(userId);
  }

  // GET /api/v1/payouts/invoices – invoice archive (F-345)
  @Get("invoices")
  listInvoices(@CurrentUser() userId: string) {
    return this.invoice.listInvoices(userId);
  }

  // GET /api/v1/payouts/:id/invoice – invoice PDF download (F-344)
  @Get(":id/invoice")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadInvoice(@Param("id") id: string, @Res() res: any) {
    const pdfBuffer = await this.invoice.generateInvoicePdf(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${id}.pdf"`);
    res.send(pdfBuffer);
  }

  // GET /api/v1/payouts/:id/invoice/xml – invoice as ZUGFeRD / XRechnung XML (F-411)
  @Get(":id/invoice/xml")
  getInvoiceXml(@Param("id") id: string) {
    return this.invoice.getInvoiceXml(id);
  }

  // GET /api/v1/payouts/accounting-export?year=2026&format=datev – Datev/ELSTER export (F-402)
  @Get("accounting-export")
  accountingExport(@CurrentUser() userId: string, @Query("year") year?: string, @Query("format") format?: string) {
    return this.invoice.getAccountingExport(userId, year ? Number(year) : new Date().getFullYear(), format ?? 'datev');
  }

  // GET /api/v1/payouts/kyc/status – KYC-Status abrufen (F-392)
  @Get("kyc/status")
  kycStatus(@CurrentUser() userId: string) {
    return this.payouts.getKycStatus(userId);
  }

  // POST /api/v1/payouts/kyc/submit – KYC-Daten einreichen (F-392)
  @Post("kyc/submit")
  kycSubmit(@CurrentUser() userId: string, @Body() data: Record<string, unknown>) {
    return this.payouts.submitKyc(userId, data);
  }

  // GET /api/v1/payouts/price-policy – Plattform-Preisdeckel (F-377)
  @Get("price-policy")
  pricePolicy() {
    return this.payouts.getPricePolicy();
  }
}
