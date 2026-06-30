import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { PayoutsService } from "./payouts.service";
import { TipsService } from "./tips.service";
import { TaxStatementService } from "./tax-statement.service";
import { InvoiceService } from "./invoice.service";
import { PaymentsStubsService } from "./payments-stubs.service";

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
    private readonly stubs: PaymentsStubsService,
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

  // ─── F-322: Permanent Purchase ────────────────────────────────────────

  // POST /api/v1/payouts/permanent-purchase – Werk dauerhaft erwerben (F-322)
  @Post("permanent-purchase")
  @Roles(UserRole.LISTENER)
  purchasePermanent(@CurrentUser() userId: string, @Body("workId") workId: string) {
    return this.stubs.purchasePermanent(userId, workId);
  }

  // GET /api/v1/payouts/permanent-purchases – eigene Dauerkäufe (F-322)
  @Get("permanent-purchases")
  @Roles(UserRole.LISTENER)
  getPermanentPurchases(@CurrentUser() userId: string) {
    return this.stubs.getPermanentPurchases(userId);
  }

  // ─── F-324/F-325: Spende & externe Links ─────────────────────────────

  // GET /api/v1/payouts/donation-config – Spende-Konfig abrufen (F-324)
  @Get("donation-config")
  getDonationConfig(@CurrentUser() userId: string) {
    return this.stubs.getDonationConfig(userId);
  }

  // PUT /api/v1/payouts/donation-config – Spende-Konfig setzen (F-324)
  @Put("donation-config")
  setDonationConfig(
    @CurrentUser() userId: string,
    @Body("enabled") enabled: boolean,
    @Body("minAmountCents") minAmountCents: number,
  ) {
    return this.stubs.setDonationConfig(userId, enabled, minAmountCents);
  }

  // GET /api/v1/payouts/funding-links – Ko-fi / Patreon Links (F-325)
  @Get("funding-links")
  getExternalFundingLinks(@CurrentUser() userId: string) {
    return this.stubs.getExternalFundingLinks(userId);
  }

  // PUT /api/v1/payouts/funding-links – Ko-fi / Patreon Links setzen (F-325)
  @Put("funding-links")
  setExternalFundingLinks(
    @CurrentUser() userId: string,
    @Body("kofi") kofi?: string,
    @Body("patreon") patreon?: string,
    @Body("buymeacoffee") buymeacoffee?: string,
  ) {
    return this.stubs.setExternalFundingLinks(userId, { kofi, patreon, buymeacoffee });
  }

  // ─── F-326/F-327: Bundles & Sales ────────────────────────────────────

  // POST /api/v1/payouts/bundles – Bundle-Angebot erstellen (F-326)
  @Post("bundles")
  createBundle(
    @CurrentUser() userId: string,
    @Body("name") name: string,
    @Body("workIds") workIds: string[],
    @Body("discountPercent") discountPercent: number,
  ) {
    return this.stubs.createBundle(userId, name, workIds, discountPercent);
  }

  // GET /api/v1/payouts/bundles – eigene Bundles abrufen (F-326)
  @Get("bundles")
  getBundles(@CurrentUser() userId: string) {
    return this.stubs.getBundles(userId);
  }

  // POST /api/v1/payouts/sales – Saisonalen Sale anlegen (F-327)
  @Post("sales")
  createSale(
    @CurrentUser() userId: string,
    @Body("workIds") workIds: string[],
    @Body("discountPercent") discountPercent: number,
    @Body("startsAt") startsAt: string,
    @Body("endsAt") endsAt: string,
  ) {
    return this.stubs.createSale(userId, workIds, discountPercent, startsAt, endsAt);
  }

  // GET /api/v1/payouts/sales – aktive Sales abrufen (F-327)
  @Get("sales")
  getActiveSales(@CurrentUser() userId: string) {
    return this.stubs.getActiveSales(userId);
  }

  // ─── F-328/F-329: Dynamic Pricing & Price Bounds ─────────────────────

  // GET /api/v1/payouts/pricing/dynamic – Dynamisches Pricing Konfig (F-328)
  @Get("pricing/dynamic")
  getDynamicPricingConfig() {
    return this.stubs.getDynamicPricingConfig();
  }

  // GET /api/v1/payouts/pricing/bounds – Preisuntergrenzen/-obergrenzen (F-329)
  @Get("pricing/bounds")
  getPriceBounds() {
    return this.stubs.getPriceBounds();
  }

  // ─── F-362/F-363: Payout Methods ─────────────────────────────────────

  // GET /api/v1/payouts/methods/paypal – PayPal-Auszahlung (F-362)
  @Get("methods/paypal")
  getPayPalPayoutConfig() {
    return this.stubs.getPayPalPayoutConfig();
  }

  // GET /api/v1/payouts/methods/wise – Wise-Auszahlung (F-363)
  @Get("methods/wise")
  getWisePayoutConfig() {
    return this.stubs.getWisePayoutConfig();
  }

  // ─── F-369/F-370/F-371: Tax Reporting ────────────────────────────────

  // GET /api/v1/payouts/tax/vat-pre-return – USt-Vorausmeldung (F-369)
  @Get("tax/vat-pre-return")
  getVatPreReturnExport(
    @CurrentUser() userId: string,
    @Query("year") year?: string,
    @Query("period") period?: 'monthly' | 'quarterly',
  ) {
    return this.stubs.getVatPreReturnExport(userId, year ? Number(year) : new Date().getFullYear(), period ?? 'monthly');
  }

  // GET /api/v1/payouts/tax/1099k – 1099-K Formular (F-370)
  @Get("tax/1099k")
  get1099K(@CurrentUser() userId: string, @Query("year") year?: string) {
    return this.stubs.get1099K(userId, year ? Number(year) : new Date().getFullYear());
  }

  // GET /api/v1/payouts/tax/stripe-tax – Stripe Tax Konfig (F-371)
  @Get("tax/stripe-tax")
  getStripeTaxConfig() {
    return this.stubs.getStripeTaxConfig();
  }

  // ─── F-373/F-374/F-375: Revenue Models ───────────────────────────────

  // GET /api/v1/payouts/revenue-share – Bonus-Revenue-Share (F-373)
  @Get("revenue-share")
  getBonusRevenueShare(@CurrentUser() userId: string) {
    return this.stubs.getBonusRevenueShare(userId);
  }

  // GET /api/v1/payouts/streaming-royalty – Streaming-Royalties Konfig (F-374)
  @Get("streaming-royalty")
  getStreamingRoyaltyConfig() {
    return this.stubs.getStreamingRoyaltyConfig();
  }

  // GET /api/v1/payouts/metered-billing – Metered Billing Konfig (F-375)
  @Get("metered-billing")
  getMeteredBillingConfig() {
    return this.stubs.getMeteredBillingConfig();
  }

  // ─── F-376: Preisempfehlung ───────────────────────────────────────────

  // PUT /api/v1/payouts/price-recommendation/:workId – Preisempfehlung setzen (F-376)
  @Put("price-recommendation/:workId")
  setPriceRecommendation(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("recommendedCents") recommendedCents: number,
  ) {
    return this.stubs.setPriceRecommendation(userId, workId, recommendedCents);
  }

  // GET /api/v1/payouts/price-recommendation/:workId – Preisempfehlung abrufen (F-376)
  @Get("price-recommendation/:workId")
  getPriceRecommendation(@Param("workId") workId: string) {
    return this.stubs.getPriceRecommendation(workId);
  }

  // ─── F-378/F-379: Review & Press Copies ──────────────────────────────

  // POST /api/v1/payouts/review-copies – Rezensenten-Freiexemplar (F-378)
  @Post("review-copies")
  createReviewCopy(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("recipientEmail") recipientEmail: string,
  ) {
    return this.stubs.createReviewCopy(userId, workId, recipientEmail);
  }

  // POST /api/v1/payouts/press-copies – Pressekopie (F-379)
  @Post("press-copies")
  createPressCopy(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("journalistEmail") journalistEmail: string,
  ) {
    return this.stubs.createPressCopy(userId, workId, journalistEmail);
  }

  // ─── F-380: Sponsoring ───────────────────────────────────────────────

  // POST /api/v1/payouts/sponsorships – Sponsoring anlegen (F-380)
  @Post("sponsorships")
  @Roles(UserRole.LISTENER)
  createSponsorship(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("amountCents") amountCents: number,
    @Body("message") message?: string,
  ) {
    return this.stubs.createSponsorship(userId, workId, amountCents, message);
  }

  // GET /api/v1/payouts/sponsorships/:workId – Sponsorings abrufen (F-380)
  @Get("sponsorships/:workId")
  getSponsorships(@Param("workId") workId: string) {
    return this.stubs.getSponsorships(workId);
  }

  // ─── F-381/F-382: Institutional Licenses ─────────────────────────────

  // POST /api/v1/payouts/library-license – Bibliotheks-Lizenz (F-381)
  @Post("library-license")
  createLibraryLicense(
    @CurrentUser() userId: string,
    @Body("monthlyFlatrateCents") monthlyFlatrateCents: number,
  ) {
    return this.stubs.createLibraryLicense(userId, monthlyFlatrateCents);
  }

  // POST /api/v1/payouts/school-license – Schullizenz (F-382)
  @Post("school-license")
  createSchoolLicense(
    @CurrentUser() userId: string,
    @Body("studentCount") studentCount: number,
    @Body("pricePerStudentCents") pricePerStudentCents: number,
  ) {
    return this.stubs.createSchoolLicense(userId, studentCount, pricePerStudentCents);
  }

  // ─── F-384/F-385: Affiliate & Publisher ──────────────────────────────

  // POST /api/v1/payouts/affiliate – Affiliate-Link erstellen (F-384)
  @Post("affiliate")
  createAffiliateLink(@CurrentUser() userId: string) {
    return this.stubs.createAffiliateLink(userId);
  }

  // GET /api/v1/payouts/affiliate/stats – Affiliate-Statistiken (F-384)
  @Get("affiliate/stats")
  getAffiliateStats(@CurrentUser() userId: string) {
    return this.stubs.getAffiliateStats(userId);
  }

  // POST /api/v1/payouts/publisher-deal – Publisher-Deal anlegen (F-385)
  @Post("publisher-deal")
  createPublisherDeal(
    @CurrentUser() userId: string,
    @Body("artistIds") artistIds: string[],
    @Body("revenueSharePercent") revenueSharePercent: number,
  ) {
    return this.stubs.createPublisherDeal(userId, artistIds, revenueSharePercent);
  }

  // ─── F-386/F-387: Split Payments ─────────────────────────────────────

  // GET /api/v1/payouts/collab-split/:workId – Kollaborations-Split (F-386)
  @Get("collab-split/:workId")
  getCollaborationSplit(@Param("workId") workId: string) {
    return this.stubs.getCollaborationSplit(workId);
  }

  // POST /api/v1/payouts/collab-split/:workId – Kollaborations-Split setzen (F-386)
  @Post("collab-split/:workId")
  createCollaborationSplit(
    @Param("workId") workId: string,
    @Body("splits") splits: Array<{ artistId: string; percent: number }>,
  ) {
    return this.stubs.createCollaborationSplit(workId, splits);
  }

  // GET /api/v1/payouts/split-payment – Split-Payment-Konfig (F-387)
  @Get("split-payment")
  getSplitPaymentConfig(@CurrentUser() userId: string) {
    return this.stubs.getSplitPaymentConfig(userId);
  }

  // Put /api/v1/payouts/split-payment – Split-Payment-Konfig setzen (F-387)
  @Put("split-payment")
  setSplitPaymentConfig(
    @CurrentUser() userId: string,
    @Body("recipients") recipients: Array<{ accountId: string; percent: number }>,
  ) {
    return this.stubs.setSplitPaymentConfig(userId, recipients);
  }

  // ─── F-388/F-389/F-390: Disputes & Refunds ───────────────────────────

  // POST /api/v1/payouts/:id/escrow – Escrow anlegen (F-388)
  @Post(":id/escrow")
  createEscrow(@Param("id") payoutId: string, @Body("reason") reason: string) {
    return this.stubs.createEscrow(payoutId, reason);
  }

  // GET /api/v1/payouts/refund-dashboard – Rückerstattungs-Dashboard (F-389)
  @Get("refund-dashboard")
  getRefundDashboard(@CurrentUser() userId: string) {
    return this.stubs.getRefundDashboard(userId);
  }

  // GET /api/v1/payouts/chargebacks – Chargeback-Management (F-390)
  @Get("chargebacks")
  getChargebacks(@CurrentUser() userId: string) {
    return this.stubs.getChargebacks(userId);
  }

  // ─── F-393/F-394/F-395: Identity & AML ──────────────────────────────

  // GET /api/v1/payouts/id-verification/config – ID-Verifizierung Konfig (F-393)
  @Get("id-verification/config")
  getIdVerificationConfig() {
    return this.stubs.getIdVerificationConfig();
  }

  // GET /api/v1/payouts/stripe-identity/config – Stripe Identity Konfig (F-394)
  @Get("stripe-identity/config")
  getStripeIdentityConfig() {
    return this.stubs.getStripeIdentityConfig();
  }

  // GET /api/v1/payouts/aml/config – AML-Konfig (F-395)
  @Get("aml/config")
  getAmlConfig() {
    return this.stubs.getAmlConfig();
  }

  // ─── F-396/F-397/F-398/F-399/F-400: Earnings Analytics ──────────────

  // GET /api/v1/payouts/forecast – Einnahmen-Vorhersage (F-396)
  @Get("forecast")
  getEarningsForecast(@CurrentUser() userId: string) {
    return this.stubs.getEarningsForecast(userId);
  }

  // GET /api/v1/payouts/break-even – Break-Even-Rechner (F-397)
  @Get("break-even")
  calculateBreakEven(
    @CurrentUser() userId: string,
    @Query("productionCostCents") productionCostCents?: string,
  ) {
    return this.stubs.calculateBreakEven(userId, productionCostCents ? Number(productionCostCents) : 100000);
  }

  // POST /api/v1/payouts/earnings-goal – Einnahmen-Ziel setzen (F-398)
  @Post("earnings-goal")
  setEarningsGoal(
    @CurrentUser() userId: string,
    @Body("targetCents") targetCents: number,
    @Body("deadline") deadline: string,
  ) {
    return this.stubs.setEarningsGoal(userId, targetCents, deadline);
  }

  // GET /api/v1/payouts/earnings-goal – Ziel-Fortschritt abrufen (F-398)
  @Get("earnings-goal")
  getEarningsGoalProgress(@CurrentUser() userId: string) {
    return this.stubs.getEarningsGoalProgress(userId);
  }

  // GET /api/v1/payouts/benchmark – anonymer Benchmark (F-399)
  @Get("benchmark")
  getAnonymousBenchmark(@CurrentUser() userId: string) {
    return this.stubs.getAnonymousBenchmark(userId);
  }

  // GET /api/v1/payouts/earnings-widget – Einnahmen-Widget (F-400)
  @Get("earnings-widget")
  getEarningsWidget(@CurrentUser() userId: string) {
    return this.stubs.getEarningsWidget(userId);
  }

  // ─── F-403/F-404: Label & License Fees ───────────────────────────────

  // GET /api/v1/payouts/label-split – Label-Split Konfig (F-403)
  @Get("label-split")
  getLabelSplitConfig(@CurrentUser() userId: string) {
    return this.stubs.getLabelSplitConfig(userId);
  }

  // PUT /api/v1/payouts/label-split – Label-Split setzen (F-403)
  @Put("label-split")
  setLabelSplitConfig(
    @CurrentUser() userId: string,
    @Body("labelId") labelId: string,
    @Body("labelPercent") labelPercent: number,
  ) {
    return this.stubs.setLabelSplitConfig(userId, labelId, labelPercent);
  }

  // GET /api/v1/payouts/license-fees/:workId – Lizenzgebühren (F-404)
  @Get("license-fees/:workId")
  getLicenseFees(@Param("workId") workId: string) {
    return this.stubs.getLicenseFees(workId);
  }

  // POST /api/v1/payouts/license-fees/:workId – Lizenzgebühr hinzufügen (F-404)
  @Post("license-fees/:workId")
  addLicenseFee(
    @Param("workId") workId: string,
    @Body("licensorName") licensorName: string,
    @Body("ratePercent") ratePercent: number,
  ) {
    return this.stubs.addLicenseFee(workId, licensorName, ratePercent);
  }

  // ─── F-405/F-406: Crowdfunding & Donation Receipts ───────────────────

  // GET /api/v1/payouts/crowdfunding/:campaignId – Crowdfunding-Status (F-405)
  @Get("crowdfunding/:campaignId")
  getCrowdfundingRefundStatus(@Param("campaignId") campaignId: string) {
    return this.stubs.getCrowdfundingRefundStatus(campaignId);
  }

  // GET /api/v1/payouts/donation-receipt – Spendenquittung (F-406)
  @Get("donation-receipt")
  getDonationReceipt(@CurrentUser() userId: string, @Query("year") year?: string) {
    return this.stubs.getDonationReceipt(userId, year ? Number(year) : new Date().getFullYear());
  }
}
