import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { AdminService } from "./admin.service";
import { DmcaService } from "./dmca.service";
import { FeatureFlagsService } from "./feature-flags.service";
import { AnalyticsService } from "./analytics.service";
import { AbTestingService } from "./ab-testing.service";
import { ContentModerationService } from "./content-moderation.service";
import { TranslationManagementService } from "../users/translation-management.service";

/** Admin-Backoffice (B-151, B-152, B-154, B-155). Nur für ADMIN-Rolle. */
@ApiTags("admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly dmca: DmcaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly analytics: AnalyticsService,
    private readonly abTesting: AbTestingService,
    private readonly contentModeration: ContentModerationService,
    private readonly translationManagement: TranslationManagementService,
  ) {}

  // GET /api/v1/admin/stats – Plattform-Übersicht
  @Get("stats")
  stats() {
    return this.admin.platformStats();
  }

  // GET /api/v1/admin/users?role=ARTIST&search=max&page=1 (F-381)
  @Get("users")
  listUsers(
    @Query("page") page = "1",
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.listUsers({
      role,
      status,
      search,
      page: Number(page),
      limit: limit ? Number(limit) : undefined,
    });
  }

  // PATCH /api/v1/admin/users/:id/role – Rolle setzen (F-382)
  @Patch("users/:id/role")
  setUserRole(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("role") role: string,
  ) {
    return this.admin.setUserRole(actorId, id, role);
  }

  // POST /api/v1/admin/users/:id/subscription – Abo manuell aktivieren (F-383)
  @Post("users/:id/subscription")
  activateSubscription(
    @Param("id") id: string,
    @Body("plan") plan: string,
    @Body("durationDays") durationDays: number,
  ) {
    return this.admin.activateSubscription(id, plan, durationDays);
  }

  // POST /api/v1/admin/users/:id/suspend – Nutzer:in sperren (F-384)
  @Post("users/:id/suspend")
  suspend(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("reason") reason?: string,
  ) {
    return this.admin.suspendUser(actorId, id, reason);
  }

  // POST /api/v1/admin/users/:id/unsuspend – Sperre aufheben (F-384)
  @Post("users/:id/unsuspend")
  unsuspend(@CurrentUser() actorId: string, @Param("id") id: string) {
    return this.admin.unsuspendUser(actorId, id);
  }

  // POST /api/v1/admin/works/:id/moderate – Inhalt moderieren (B-152)
  @Post("works/:id/moderate")
  moderateWork(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("action") action: "unpublish" | "publish",
  ) {
    return this.admin.moderateWork(actorId, id, action);
  }

  // POST /api/v1/admin/works/:id/approve – Werk genehmigen (F-385)
  @Post("works/:id/approve")
  approveWork(@CurrentUser() actorId: string, @Param("id") id: string) {
    return this.admin.approveWork(actorId, id);
  }

  // POST /api/v1/admin/works/:id/reject – Werk ablehnen (F-385)
  @Post("works/:id/reject")
  rejectWork(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("reason") reason?: string,
  ) {
    return this.admin.rejectWork(actorId, id, reason);
  }

  // POST /api/v1/admin/announcements – Ankündigung erstellen (F-390)
  @Post("announcements")
  createAnnouncement(
    @CurrentUser() actorId: string,
    @Body()
    body: { title: string; body: string; type?: string; startsAt?: string; endsAt?: string },
  ) {
    return this.admin.createAnnouncement(actorId, body);
  }

  // GET /api/v1/admin/announcements – Ankündigungen auflisten (F-390)
  @Get("announcements")
  listAnnouncementsAdmin() {
    return this.admin.listAnnouncements(false);
  }

  // DELETE /api/v1/admin/announcements/:id – Ankündigung löschen (F-390)
  @Delete("announcements/:id")
  deleteAnnouncement(@Param("id") id: string) {
    return this.admin.deleteAnnouncement(id);
  }

  // GET /api/v1/admin/audit-log – Audit-Log (B-155)
  @Get("audit-log")
  auditLog(@Query("page") page = "1", @Query("limit") limit = "50") {
    return this.admin.listAuditLogs(Number(page), Number(limit));
  }

  // GET /api/v1/admin/users/:id/audit-log – Nutzer:in Audit-Log (F-936)
  @Get("users/:id/audit-log")
  userAuditLog(
    @Param("id") id: string,
    @Query("page") page = "1",
    @Query("limit") limit = "50",
  ) {
    return this.admin.listUserAuditLog(id, Number(page), Number(limit));
  }

  // POST /api/v1/admin/reviews/:id/hide – Rezension ausblenden (B-131)
  @Post("reviews/:id/hide")
  hideReview(@CurrentUser() actorId: string, @Param("id") reviewId: string) {
    return this.admin.hideReview(actorId, reviewId);
  }

  // POST /api/v1/admin/promo-codes – Promo-Code erstellen (B-087)
  @Post("promo-codes")
  createPromoCode(
    @Body() body: { code: string; discountPercent?: number; discountCents?: number; plan?: string; maxUses?: number; expiresAt?: string },
  ) {
    return this.admin.createPromoCode(body);
  }

  // GET /api/v1/admin/promo-codes – Promo-Codes auflisten (B-087)
  @Get("promo-codes")
  listPromoCodes() {
    return this.admin.listPromoCodes();
  }

  // GET /api/v1/admin/reports – Meldungen auflisten (B-139, B-153)
  @Get("reports")
  listReports(@Query("page") page = "1", @Query("status") status?: string) {
    return this.admin.listReports(Number(page), status);
  }

  // PATCH /api/v1/admin/reports/:id – Meldung bearbeiten (B-153)
  @Patch("reports/:id")
  reviewReport(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("action") action: "REVIEWED" | "DISMISSED",
  ) {
    return this.admin.reviewReport(actorId, id, action);
  }

  // POST /api/v1/admin/users/:id/notes – Admin-Notiz anlegen (F-081)
  @Post("users/:id/notes")
  addNote(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("body") body: string,
  ) {
    return this.admin.addNote(actorId, id, body);
  }

  // GET /api/v1/admin/users/:id/notes – Admin-Notizen abrufen (F-081)
  @Get("users/:id/notes")
  getNotes(@Param("id") id: string) {
    return this.admin.getNotes(id);
  }

  // POST /api/v1/admin/users/:id/badges – Badge vergeben (F-065)
  @Post("users/:id/badges")
  awardBadge(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("type") type: string,
  ) {
    return this.admin.awardBadge(actorId, id, type);
  }

  // GET /api/v1/admin/dmca – DMCA-Anträge auflisten (ADMIN)
  @Get("dmca")
  dmcaList(@Query("status") status?: string) {
    return this.dmca.listRequests(status);
  }

  // PATCH /api/v1/admin/dmca/:id – DMCA-Antrag bearbeiten (ADMIN)
  @Patch("dmca/:id")
  dmcaResolve(
    @Param("id") id: string,
    @Body() body: { action: "TAKE_DOWN" | "DISMISS"; adminNote?: string },
  ) {
    return this.dmca.resolveRequest(id, body.action, body.adminNote);
  }

  // GET /api/v1/admin/feature-flags – Feature-Flags auflisten (ADMIN)
  @Get("feature-flags")
  listFeatureFlags() {
    return this.featureFlags.list();
  }

  // PUT /api/v1/admin/feature-flags/:key – Feature-Flag erstellen/aktualisieren (ADMIN)
  @Put("feature-flags/:key")
  upsertFeatureFlag(
    @Param("key") key: string,
    @Body() body: { enabled: boolean; description?: string; rolloutPct?: number },
  ) {
    return this.featureFlags.upsert(key, body.enabled, body.description, body.rolloutPct);
  }

  // DELETE /api/v1/admin/feature-flags/:key – Feature-Flag löschen (ADMIN)
  @Delete("feature-flags/:key")
  deleteFeatureFlag(@Param("key") key: string) {
    return this.featureFlags.delete(key);
  }

  // GET /api/v1/admin/webhooks – Webhook-Deliveries auflisten (F-701)
  @Get("webhooks")
  listWebhookDeliveries(
    @Query("event") event?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("failed") failed?: string,
  ) {
    return this.admin.listWebhookDeliveries({ event, from, to, failed: failed === 'true' });
  }

  // POST /api/v1/admin/webhooks/:id/retry – Webhook-Delivery wiederholen (F-701)
  @Post("webhooks/:id/retry")
  retryWebhookDelivery(@Param("id") id: string) {
    return this.admin.retryWebhookDelivery(id);
  }

  // GET /api/v1/admin/reports/works.csv – Werke-CSV-Export (F-751)
  @Get("reports/works.csv")
  @Header("Content-Type", "text/csv")
  async exportWorksCsv(@Query("from") from?: string, @Query("to") to?: string) {
    return this.admin.exportWorksCsv(from, to);
  }

  // GET /api/v1/admin/analytics/heatmap – Aktivitäts-Heatmap (F-755)
  @Get("analytics/heatmap")
  activityHeatmap(@Query("year") year?: string) {
    return this.analytics.getActivityHeatmap(year ? Number(year) : undefined);
  }

  // GET /api/v1/admin/analytics/funnel – Conversion-Funnel (F-760)
  @Get("analytics/funnel")
  conversionFunnel() {
    return this.analytics.getConversionFunnel();
  }

  // GET /api/v1/admin/analytics/churn – Churn-Analyse (F-762)
  @Get("analytics/churn")
  churnAnalysis(@Query("period") period?: string) {
    return this.analytics.getChurnAnalysis(period);
  }

  // GET /api/v1/admin/analytics/cohort-retention – Kohorten-Retention (F-765)
  @Get("analytics/cohort-retention")
  cohortRetention(@Query("cohortMonths") cohortMonths?: string) {
    return this.analytics.getCohortRetention(cohortMonths ? Number(cohortMonths) : 6);
  }

  // GET /api/v1/admin/analytics/retention-curve – Retention-Kurve (F-765)
  @Get("analytics/retention-curve")
  retentionCurve(@Query("daysMax") daysMax?: string) {
    return this.analytics.getRetentionCurve(daysMax ? Number(daysMax) : 365);
  }

  // GET /api/v1/admin/analytics/user-growth – Nutzerwachstum (F-766)
  @Get("analytics/user-growth")
  userGrowth(@Query("period") period?: "daily" | "weekly" | "monthly") {
    return this.analytics.getUserGrowth(period ?? "monthly");
  }

  // GET /api/v1/admin/analytics/revenue – Umsatz-Metriken (F-766)
  @Get("analytics/revenue")
  revenueMetrics(@Query("period") period?: "monthly" | "weekly" | "daily") {
    return this.analytics.getRevenueMetrics(period ?? "monthly");
  }

  // POST /api/v1/admin/ab-tests – A/B-Test erstellen (ADMIN, F-080)
  @Post("ab-tests")
  createAbTest(
    @Body() body: { testKey: string; description?: string },
  ) {
    return this.abTesting.createTest(body.testKey, body.description);
  }

  // GET /api/v1/admin/ab-tests – A/B-Tests auflisten (ADMIN, F-080)
  @Get("ab-tests")
  listAbTests() {
    return this.abTesting.listTests();
  }

  // GET /api/v1/admin/ab-tests/:testKey/results – A/B-Test-Ergebnisse (ADMIN, F-080)
  @Get("ab-tests/:testKey/results")
  getAbTestResults(@Param("testKey") testKey: string) {
    return this.abTesting.getTestResults(testKey);
  }

  // POST /api/v1/admin/works/:id/moderate-ai – AI Content Moderation stub (F-916)
  @Post("works/:id/moderate-ai")
  moderateWorkAi(@Param("id") id: string) {
    return this.contentModeration.moderateWork(id);
  }

  // GET /api/v1/admin/translations/pending – Pending translations list (F-996)
  @Get("translations/pending")
  listPendingTranslations(@Query("lang") lang = 'en') {
    return this.translationManagement.listPendingTranslations(lang);
  }

  // GET /api/v1/admin/translations/export.csv – Export pending translations as CSV (F-996)
  @Get("translations/export.csv")
  @Header("Content-Type", "text/csv")
  async exportTranslationsCsv(@Query("lang") lang = 'en') {
    return this.translationManagement.exportForTranslation(lang);
  }

  // GET /api/v1/admin/vat-export – VAT data export stub (F-369)
  @Get("vat-export")
  vatExport(
    @Query("year") year?: string,
    @Query("quarter") quarter?: string,
  ) {
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const q = quarter ? Number(quarter) : Math.ceil((now.getMonth() + 1) / 3);
    return this.admin.exportVatData(y, q);
  }

  // PATCH /api/v1/admin/platform-fee – set platform fee percent (F-372)
  @Patch("platform-fee")
  setPlatformFee(@Body("percent") percent: number) {
    return this.admin.setPlatformFee(percent);
  }

  // GET /api/v1/admin/analytics/geo – Geographic listener breakdown (F-428)
  @Get("analytics/geo")
  geoBreakdown(@Query("workId") workId?: string) {
    return this.analytics.getGeoBreakdown(workId);
  }

  // POST /api/v1/admin/works/:id/feature – Werk featuren (F-133)
  @Post("works/:id/feature")
  featureWork(@Param("id") id: string) {
    return this.admin.featureWork(id);
  }

  // DELETE /api/v1/admin/works/:id/feature – Featured-Status entfernen (F-133)
  @Delete("works/:id/feature")
  unfeatureWork(@Param("id") id: string) {
    return this.admin.unfeatureWork(id);
  }

  // GET /api/v1/admin/featured-works – Featured-Werke auflisten (F-133)
  @Get("featured-works")
  getFeaturedWorks() {
    return this.admin.getFeaturedWorks();
  }

  // POST /api/v1/admin/payouts/:id/flag – Betrug markieren (F-391)
  @Post("payouts/:id/flag")
  flagPayout(@Param("id") id: string) {
    return this.admin.flagPayoutItem(id, true);
  }

  // Delete /api/v1/admin/payouts/:id/flag – Betrug-Flag entfernen (F-391)
  @Delete("payouts/:id/flag")
  unflagPayout(@Param("id") id: string) {
    return this.admin.flagPayoutItem(id, false);
  }

  // GET /api/v1/admin/payouts/flagged – Verdächtige Auszahlungen (F-391)
  @Get("payouts/flagged")
  listFlaggedPayouts() {
    return this.admin.listFlaggedPayouts();
  }

  // POST /api/v1/admin/reports/:id/assign – Meldung zuweisen (F-721)
  @Post("reports/:id/assign")
  assignReport(@Param("id") id: string, @Body("assigneeId") assigneeId: string) {
    return this.admin.assignReport(id, assigneeId);
  }

  // PATCH /api/v1/admin/reports/:id/status – Meldungs-Status setzen (F-722)
  @Patch("reports/:id/status")
  updateReportStatus(
    @CurrentUser() actorId: string,
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("reviewNote") reviewNote?: string,
  ) {
    return this.admin.updateReportStatus(id, status, actorId, reviewNote);
  }

  // GET /api/v1/admin/reports/queue – Meldungs-Queue (F-720)
  @Get("reports/queue")
  getReportQueue(@Query("status") status?: string) {
    return this.admin.getReportQueue(status);
  }

  // GET /api/v1/admin/dashboard – Dashboard-Metriken (F-709/710/711/712)
  @Get("dashboard")
  getDashboardMetrics() {
    return this.admin.getDashboardMetrics();
  }

  // POST /api/v1/admin/users/:id/impersonate – Nutzer imitieren (F-715)
  @Post("users/:id/impersonate")
  impersonateUser(@CurrentUser() adminId: string, @Param("id") id: string) {
    return this.admin.impersonateUser(adminId, id);
  }

  // PUT /api/v1/admin/users/:id/tags – Admin-Tags setzen (F-717)
  @Put("users/:id/tags")
  setUserTags(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("tags") tags: string[],
  ) {
    return this.admin.setUserTags(adminId, id, tags);
  }

  // GET /api/v1/admin/users/by-tag/:tag – Nutzer nach Tag (F-717)
  @Get("users/by-tag/:tag")
  getUsersByTag(@Param("tag") tag: string) {
    return this.admin.getUsersByTag(tag);
  }

  // POST /api/v1/admin/users/mass-email – Massen-E-Mail senden (F-718)
  @Post("users/mass-email")
  sendMassEmail(
    @Body("filter") filter: { role?: string; tag?: string },
    @Body("subject") subject: string,
    @Body("body") body: string,
  ) {
    return this.admin.sendMassEmail(filter ?? {}, subject, body);
  }

  // PATCH /api/v1/admin/users/:id/fraud-score – Betrugs-Score setzen (F-738)
  @Patch("users/:id/fraud-score")
  setUserFraudScore(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("score") score: number,
  ) {
    return this.admin.setUserFraudScore(adminId, id, score);
  }

  // GET /api/v1/admin/users/high-fraud – Nutzer mit hohem Betrugs-Score (F-738)
  @Get("users/high-fraud")
  listHighFraudUsers(@Query("minScore") minScore?: string) {
    return this.admin.listHighFraudUsers(minScore ? Number(minScore) : undefined);
  }

  // POST /api/v1/admin/maintenance – Wartungsmodus setzen (F-742)
  @Post("maintenance")
  setMaintenanceMode(
    @CurrentUser() adminId: string,
    @Body("active") active: boolean,
    @Body("message") message?: string,
  ) {
    return this.admin.setMaintenanceMode(active, message, adminId);
  }

  // GET /api/v1/admin/analytics/dau-wau-mau – DAU/WAU/MAU (F-778)
  @Get("analytics/dau-wau-mau")
  getDAUWAUMAU() {
    return this.admin.getDAUWAUMAU();
  }

  // GET /api/v1/admin/analytics/mrr-arr – MRR/ARR (F-770)
  @Get("analytics/mrr-arr")
  getMRRARR() {
    return this.admin.getMRRARR();
  }

  // POST /api/v1/admin/reports/auto-assign – Meldungen automatisch zuweisen (F-723)
  @Post("reports/auto-assign")
  autoAssignReports() {
    return this.admin.autoAssignReports();
  }

  // POST /api/v1/admin/retention-cleanup – Datenbereinigung (F-749)
  @Post("retention-cleanup")
  runRetentionPolicyCleanup(@Body("retentionYears") retentionYears?: number) {
    return this.admin.runRetentionPolicyCleanup(retentionYears);
  }

  // GET /api/v1/admin/stats.csv – Plattform-Statistiken als CSV (F-760)
  @Get("stats.csv")
  @Header("Content-Type", "text/csv")
  exportPlatformStatsCsv() {
    return this.admin.exportPlatformStatsCsv();
  }

  // POST /api/v1/admin/reports/:id/escalate – Meldung eskalieren (F-724)
  @Post("reports/:id/escalate")
  escalateReport(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("level") level: number,
  ) {
    return this.admin.escalateReport(id, level, adminId);
  }

  // GET /api/v1/admin/content-moderation-queue – Inhalte in Review (F-725)
  @Get("content-moderation-queue")
  contentModerationQueue() {
    return this.admin.contentModerationQueue();
  }

  // POST /api/v1/admin/works/:id/hash-check – Hash-Prüfung (F-726)
  @Post("works/:id/hash-check")
  hashCheckWork(@Param("id") id: string) {
    return this.admin.hashCheckWork(id);
  }

  // POST /api/v1/admin/users/:id/violation – Verstoß verarbeiten (F-732)
  @Post("users/:id/violation")
  processViolation(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("reason") reason: string,
  ) {
    return this.admin.processViolation(adminId, id, reason);
  }

  // POST /api/v1/admin/users/:id/warning – Verwarnung ausstellen (F-733)
  @Post("users/:id/warning")
  issueWarning(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Body("deadlineHours") deadlineHours?: number,
  ) {
    return this.admin.issueWarning(adminId, id, reason, deadlineHours);
  }

  // GET /api/v1/admin/users/:id/warnings – Verwarnungen abrufen (F-733)
  @Get("users/:id/warnings")
  listWarnings(@Param("id") id: string) {
    return this.admin.listWarnings(id);
  }

  // GET /api/v1/admin/appeals – Appeal-Anfragen (F-734)
  @Get("appeals")
  listAppeals(@Query("status") status?: string) {
    return this.admin.listAppeals(status);
  }

  // PATCH /api/v1/admin/appeals/:id – Appeal bearbeiten (F-734)
  @Patch("appeals/:id")
  processAppeal(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("status") status: 'APPROVED' | 'REJECTED',
    @Body("adminNote") adminNote?: string,
  ) {
    return this.admin.processAppeal(adminId, id, status, adminNote);
  }

  // PUT /api/v1/admin/works/:id/geo-block – Geo-Block setzen (F-736)
  @Put("works/:id/geo-block")
  geoBlockWork(
    @CurrentUser() adminId: string,
    @Param("id") id: string,
    @Body("countries") countries: string[],
  ) {
    return this.admin.geoBlockWork(adminId, id, countries);
  }

  // GET /api/v1/admin/chargebacks – Chargebacks-Report (F-739)
  @Get("chargebacks")
  getChargebacksReport() {
    return this.admin.getChargebacksReport();
  }

  // POST /api/v1/admin/users/:id/pep-check – PEP/Sanktionslisten (F-740)
  @Post("users/:id/pep-check")
  pepSanctionsCheck(@Param("id") id: string) {
    return this.admin.pepSanctionsCheck(id);
  }

  // GET /api/v1/admin/analytics/churn-by-plan – Churn-Rate je Plan (F-767)
  @Get("analytics/churn-by-plan")
  churnByPlan() {
    return this.analytics.getChurnByPlan();
  }

  // GET /api/v1/admin/analytics/ltv-by-plan – LTV je Plan (F-768)
  @Get("analytics/ltv-by-plan")
  ltvByPlan() {
    return this.analytics.getLtvByPlan();
  }

  // GET /api/v1/admin/analytics/revenue-by-artist – Umsatz nach Künstler:in (F-771)
  @Get("analytics/revenue-by-artist")
  revenueByArtist(@Query("limit") limit?: string) {
    return this.analytics.getRevenueByArtist(limit ? Number(limit) : undefined);
  }

  // GET /api/v1/admin/analytics/revenue-by-category – Umsatz nach Kategorie (F-772)
  @Get("analytics/revenue-by-category")
  revenueByCategory() {
    return this.analytics.getRevenueByCategory();
  }

  // GET /api/v1/admin/analytics/engagement-score/:userId – Engagement-Score (F-777)
  @Get("analytics/engagement-score/:userId")
  engagementScore(@Param("userId") userId: string) {
    return this.analytics.getEngagementScore(userId);
  }

  // GET /api/v1/admin/analytics/sticky-factor – Sticky Factor (F-779)
  @Get("analytics/sticky-factor")
  stickyFactor() {
    return this.analytics.getStickyFactor();
  }

  // GET /api/v1/admin/analytics/search-terms – Suchterm-Popularität (F-784)
  @Get("analytics/search-terms")
  searchTermPopularity(@Query("limit") limit?: string) {
    return this.analytics.getSearchTermPopularity(limit ? Number(limit) : undefined);
  }

  // GET /api/v1/admin/analytics/null-searches – Null-Treffer-Suchen (F-785)
  @Get("analytics/null-searches")
  nullResultSearches(@Query("limit") limit?: string) {
    return this.analytics.getNullResultSearches(limit ? Number(limit) : undefined);
  }

  // GET /api/v1/admin/analytics/revenue-by-country – Umsatz nach Land (F-773)
  @Get("analytics/revenue-by-country")
  revenueByCountry() {
    return this.analytics.getRevenueByCountry();
  }

  // GET /api/v1/admin/analytics/revenue-anomaly – Anomalie-Erkennung (F-793)
  @Get("analytics/revenue-anomaly")
  revenueAnomaly() {
    return this.analytics.getRevenueAnomaly();
  }

  // GET /api/v1/admin/analytics/fake-plays – Fake-Play-Erkennung (F-794)
  @Get("analytics/fake-plays")
  detectFakePlays() {
    return this.analytics.detectFakePlays();
  }

  // GET /api/v1/admin/analytics/fraud-dashboard – Betrugs-Dashboard (F-795)
  @Get("analytics/fraud-dashboard")
  fraudDashboard() {
    return this.analytics.getFraudDashboard();
  }
}
