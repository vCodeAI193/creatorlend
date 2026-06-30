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
import { AdminStubsService } from "./admin-stubs.service";

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
    private readonly adminStubs: AdminStubsService,
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

  // GET /api/v1/admin/ab-tests/:testKey/evaluate – A/B-Test statistisch auswerten (F-787)
  @Get("ab-tests/:testKey/evaluate")
  evaluateAbTest(@Param("testKey") testKey: string) {
    return this.abTesting.evaluateTest(testKey);
  }

  // POST /api/v1/admin/works/:id/auto-flag – AI-Moderation Auto-Flag (F-728)
  @Post("works/:id/auto-flag")
  autoFlagWork(@Param("id") id: string) {
    return this.contentModeration.autoFlagSuspiciousWork(id);
  }

  // POST /api/v1/admin/backfill – Backfill-Job auslösen (F-746)
  @Post("backfill")
  triggerBackfill(
    @CurrentUser() adminId: string,
    @Body("jobName") jobName: string,
    @Body("params") params?: Record<string, unknown>,
  ) {
    return this.admin.triggerBackfill(jobName, adminId, params);
  }

  // POST /api/v1/admin/promo-codes/press-copy – Pressekopie-Code erstellen (F-379)
  @Post("promo-codes/press-copy")
  createPressCode(
    @CurrentUser() adminId: string,
    @Body("code") code: string,
    @Body("workId") workId: string,
    @Body("expiresAt") expiresAt?: string,
  ) {
    return this.admin.createPressCode(adminId, code, workId, expiresAt);
  }

  // POST /api/v1/admin/works/:id/moderate-ai – AI Content Moderation stub (F-916)
  @Post("works/:id/moderate-ai")
  moderateWorkAi(@Param("id") id: string) {
    return this.contentModeration.moderateWork(id);
  }

  // POST /api/v1/admin/works/:id/ai-flag-review – Human-in-the-Loop KI-Flagging (F-729)
  @Post("works/:id/ai-flag-review")
  reviewAiFlag(
    @CurrentUser() reviewerId: string,
    @Param("id") workId: string,
    @Body("decision") decision: 'CONFIRM' | 'DISMISS',
    @Body("note") note?: string,
  ) {
    return this.contentModeration.reviewAiFlag(workId, reviewerId, decision, note);
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

  // GET /api/v1/admin/analytics/conversion – Conversion-Rate (F-774)
  @Get("analytics/conversion")
  conversion() {
    return this.analytics.getConversionRate();
  }

  // GET /api/v1/admin/analytics/funnel – Funnel-Report (F-775)
  @Get("analytics/funnel")
  funnel() {
    return this.analytics.getFunnelReport();
  }

  // GET /api/v1/admin/analytics/feature-adoption – Feature-Adoption (F-780)
  @Get("analytics/feature-adoption")
  featureAdoption() {
    return this.analytics.getFeatureAdoptionRate();
  }

  // GET /api/v1/admin/analytics/session-histogram – Session-Länge (F-781)
  @Get("analytics/session-histogram")
  sessionHistogram() {
    return this.analytics.getSessionLengthHistogram();
  }

  // GET /api/v1/admin/analytics/recommendation-ctr – Empfehlungs-CTR (F-786)
  @Get("analytics/recommendation-ctr")
  recommendationCtr() {
    return this.analytics.getRecommendationCtr();
  }

  // GET /api/v1/admin/analytics/errors – Error-Tracking (F-815)
  @Get("analytics/errors")
  errorTracking() {
    return this.analytics.getErrorTracking();
  }

  // GET /api/v1/admin/analytics/performance – Performance-Profiling (F-816)
  @Get("analytics/performance")
  performance() {
    return this.analytics.getPerformanceSummary();
  }

  // GET /api/v1/admin/analytics/slow-queries – Slow-Query-Log (F-817)
  @Get("analytics/slow-queries")
  slowQueries() {
    return this.analytics.getSlowQueries();
  }

  // GET /api/v1/admin/analytics/cache-hit-rate – Cache-Hit-Rate (F-818)
  @Get("analytics/cache-hit-rate")
  cacheHitRate() {
    return this.analytics.getCacheHitRate();
  }

  // GET /api/v1/admin/analytics/feature-requests – Feature-Request-Voting (F-811)
  @Get("analytics/feature-requests")
  featureRequests() {
    return this.analytics.getFeatureRequestVoting();
  }

  // GET /api/v1/admin/analytics/synthetic-monitoring – Synthetic Monitoring (F-758)
  @Get("analytics/synthetic-monitoring")
  syntheticMonitoring() {
    return this.analytics.getSyntheticMonitoring();
  }

  // GET /api/v1/admin/analytics/core-web-vitals – Core Web Vitals (F-783)
  @Get("analytics/core-web-vitals")
  coreWebVitals() {
    return this.analytics.getCoreWebVitals();
  }

  // GET /api/v1/admin/analytics/privacy-config – Privacy-konforme Analytics (F-797/F-798)
  @Get("analytics/privacy-config")
  privacyAnalytics() {
    return this.analytics.getPrivacyAnalyticsConfig();
  }

  // GET /api/v1/admin/analytics/cdn-bandwidth – CDN-Bandbreiten-Nutzung (F-819)
  @Get("analytics/cdn-bandwidth")
  cdnBandwidth() {
    return this.analytics.getCdnBandwidthUsage();
  }

  // GET /api/v1/admin/analytics/external-monitoring – App Store, Social, Brand, Competitors (F-804-808)
  @Get("analytics/external-monitoring")
  externalMonitoring() {
    return this.analytics.getExternalMonitoringConfig();
  }

  // GET /api/v1/admin/analytics/csat – CSAT-Score (F-810)
  @Get("analytics/csat")
  csatStats() {
    return this.analytics.getCsatStats();
  }

  // GET /api/v1/admin/analytics/ux – Heatmap, Session Recording, Form Analytics (F-812-814)
  @Get("analytics/ux")
  uxAnalytics() {
    return this.analytics.getUxAnalyticsConfig();
  }

  // GET /api/v1/admin/analytics/cost – Infrastrukturkosten je Feature (F-820)
  @Get("analytics/cost")
  costAnalysis() {
    return this.analytics.getCostAnalysis();
  }

  // POST /api/v1/admin/users/:id/notes – Admin-Notiz hinzufügen (F-716)
  @Post("users/:id/notes")
  addUserNote(
    @CurrentUser() adminId: string,
    @Param("id") userId: string,
    @Body("body") body: string,
  ) {
    return this.admin.addUserNote(adminId, userId, body);
  }

  // GET /api/v1/admin/users/:id/notes – Admin-Notizen abrufen (F-716)
  @Get("users/:id/notes")
  getUserNotes(@Param("id") userId: string) {
    return this.admin.getUserNotes(userId);
  }

  // DELETE /api/v1/admin/notes/:noteId – Admin-Notiz löschen (F-716)
  @Delete("notes/:noteId")
  deleteUserNote(@CurrentUser() adminId: string, @Param("noteId") noteId: string) {
    return this.admin.deleteUserNote(adminId, noteId);
  }

  // POST /api/v1/admin/promo-codes/:codeId/mass-distribute – Promo-Code verteilen (F-719)
  @Post("promo-codes/:codeId/mass-distribute")
  massDistributePromoCode(
    @CurrentUser() adminId: string,
    @Param("codeId") codeId: string,
    @Body("filter") filter: { role?: string; tag?: string },
  ) {
    return this.admin.massDistributePromoCode(adminId, codeId, filter ?? {});
  }

  // POST /api/v1/admin/works/:id/copyright-screen – Audio-Copyright-Screening (F-727)
  @Post("works/:id/copyright-screen")
  audioCopyrightScreen(@Param("id") id: string) {
    return this.admin.audioCopyrightScreening(id);
  }

  // POST /api/v1/admin/dmca/:id/counter-notice – DMCA Counter-Notice (F-731)
  @Post("dmca/:id/counter-notice")
  dmcaCounterNotice(
    @CurrentUser() adminId: string,
    @Param("id") takedownId: string,
    @Body("workId") workId: string,
    @Body("statement") statement: string,
  ) {
    return this.admin.submitDmcaCounterNotice(workId, adminId, statement, takedownId);
  }

  // POST /api/v1/admin/incident-email – Incident-E-Mail senden (F-698)
  @Post("incident-email")
  sendIncidentEmail(
    @CurrentUser() adminId: string,
    @Body("subject") subject: string,
    @Body("body") body: string,
  ) {
    return this.admin.sendIncidentEmail(subject, body, adminId);
  }

  // GET /api/v1/admin/faq – Platform-FAQ auflisten (F-695)
  @Get("faq")
  listPlatformFaqs(@Query("q") q?: string, @Query("category") category?: string) {
    return this.admin.searchPlatformFaqs(q, category);
  }

  // PUT /api/v1/admin/faq/:id – Platform-FAQ erstellen/aktualisieren (F-695)
  @Put("faq/:id")
  upsertPlatformFaq(
    @Param("id") id: string,
    @Body() body: { category: string; question: string; answer: string; sortOrder?: number },
  ) {
    return this.admin.upsertPlatformFaq(id, body);
  }

  // POST /api/v1/admin/faq – Platform-FAQ anlegen (F-695)
  @Post("faq")
  createPlatformFaq(
    @Body() body: { category: string; question: string; answer: string; sortOrder?: number },
  ) {
    return this.admin.upsertPlatformFaq(undefined, body);
  }

  // DELETE /api/v1/admin/faq/:id – Platform-FAQ löschen (F-695)
  @Delete("faq/:id")
  deletePlatformFaq(@Param("id") id: string) {
    return this.admin.deletePlatformFaq(id);
  }

  // PATCH /api/v1/admin/users/:id/sub-role – Sub-Rolle setzen (F-702)
  @Patch("users/:id/sub-role")
  setSubRole(
    @CurrentUser() adminId: string,
    @Param("id") userId: string,
    @Body("subRole") subRole: string,
    @Body("active") active: boolean,
  ) {
    return this.admin.setSubRole(adminId, userId, subRole, active);
  }

  // GET /api/v1/admin/users/:id/sub-roles – Sub-Rollen abrufen (F-702)
  @Get("users/:id/sub-roles")
  listSubRoles(@Param("id") userId: string) {
    return this.admin.listSubRoles(userId);
  }

  // GET /api/v1/admin/analytics/notifications – Benachrichtigungs-Analytics (F-667)
  @Get("analytics/notifications")
  notificationAnalytics(@Query("since") since?: string) {
    return this.admin.getNotificationAnalytics(since);
  }

  // ─── F-705: Admin session config ─────────────────────────────────────────
  @Get("session-config")
  getAdminSessionConfig() { return this.adminStubs.getAdminSessionConfig(); }

  @Put("session-config")
  setAdminSessionConfig(@Body() config: Record<string, unknown>) { return this.adminStubs.setAdminSessionConfig(config); }

  // ─── F-706: Admin IP whitelist ────────────────────────────────────────────
  @Get("ip-whitelist")
  getAdminIpWhitelist() { return this.adminStubs.getAdminIpWhitelist(); }

  @Post("ip-whitelist")
  addAdminIpWhitelist(@Body("ip") ip: string) { return this.adminStubs.addAdminIpWhitelist(ip); }

  @Delete("ip-whitelist/:ip")
  removeAdminIpWhitelist(@Param("ip") ip: string) { return this.adminStubs.removeAdminIpWhitelist(ip); }

  // ─── F-707: 2FA enforcement ───────────────────────────────────────────────
  @Get("mfa-status")
  getAdminMfaStatus() { return this.adminStubs.getAdminMfaStatus(); }

  // ─── F-708: Admin handover protocol ──────────────────────────────────────
  @Get("handover/:fromAdminId")
  getHandoverProtocol(@Param("fromAdminId") fromAdminId: string) { return this.adminStubs.getHandoverProtocol(fromAdminId); }

  @Post("handover")
  createHandoverProtocol(
    @CurrentUser() adminId: string,
    @Body("toAdminId") toAdminId: string,
    @Body("items") items: string[],
  ) { return this.adminStubs.createHandoverProtocol(adminId, toAdminId, items); }

  // ─── F-715: User impersonation (stub with audit log) ─────────────────────
  @Post("impersonate/:userId")
  impersonateUserStub(@CurrentUser() adminId: string, @Param("userId") userId: string) { return this.adminStubs.impersonateUser(adminId, userId); }

  // ─── F-718: Mass email ────────────────────────────────────────────────────
  @Post("mass-email")
  scheduleMassEmail(
    @CurrentUser() adminId: string,
    @Body("subject") subject: string,
    @Body("templateId") templateId: string,
    @Body("filter") filter: Record<string, unknown>,
  ) { return this.adminStubs.scheduleMassEmail(adminId, subject, templateId, filter); }

  @Get("mass-email/jobs")
  getMassEmailJobs(@CurrentUser() adminId: string) { return this.adminStubs.getMassEmailJobs(adminId); }

  // ─── F-723: Auto-assign rules ─────────────────────────────────────────────
  @Get("auto-assign-rules")
  getAutoAssignRules() { return this.adminStubs.getAutoAssignRules(); }

  @Put("auto-assign-rules")
  setAutoAssignRules(@Body("rules") rules: Array<{ category: string; assigneeId: string }>) { return this.adminStubs.setAutoAssignRules(rules); }

  // ─── F-724: Escalation config ─────────────────────────────────────────────
  @Get("escalation-config")
  getEscalationConfig() { return this.adminStubs.getEscalationConfig(); }

  @Put("escalation-config")
  setEscalationConfig(@Body() config: Record<string, unknown>) { return this.adminStubs.setEscalationConfig(config); }

  @Post("reports/:reportId/escalate-stub")
  escalateReportStub(@CurrentUser() adminId: string, @Param("reportId") reportId: string, @Body("level") level: number) {
    return this.adminStubs.escalateReport(adminId, reportId, level);
  }

  // ─── F-731: DMCA counter-notice ───────────────────────────────────────────
  @Post("dmca/:takedownId/counter-notice")
  submitDmcaCounterNotice(
    @CurrentUser() artistId: string,
    @Param("takedownId") takedownId: string,
    @Body("basis") basis: string,
    @Body("statement") statement: string,
  ) { return this.adminStubs.submitDmcaCounterNotice(artistId, takedownId, basis, statement); }

  @Get("dmca/:takedownId/counter-notice")
  getDmcaCounterNotice(@Param("takedownId") takedownId: string) { return this.adminStubs.getDmcaCounterNotice(takedownId); }

  // ─── F-732: Strike system ─────────────────────────────────────────────────
  @Get("users/:userId/strikes")
  getUserStrikes(@Param("userId") userId: string) { return this.adminStubs.getUserStrikes(userId); }

  @Post("users/:userId/strikes")
  addUserStrike(@CurrentUser() adminId: string, @Param("userId") userId: string, @Body("reason") reason: string) {
    return this.adminStubs.addUserStrike(adminId, userId, reason);
  }

  // ─── F-733: Warnings (stub with deadline) ────────────────────────────────
  @Post("users/:userId/warnings")
  issueWarningStub(
    @CurrentUser() adminId: string,
    @Param("userId") userId: string,
    @Body("message") message: string,
    @Body("deadlineHours") deadlineHours: number,
  ) { return this.adminStubs.issueWarning(adminId, userId, message, deadlineHours); }

  @Get("users/:userId/warnings")
  getUserWarnings(@Param("userId") userId: string) { return this.adminStubs.getUserWarnings(userId); }

  // ─── F-734: Appeal process ────────────────────────────────────────────────
  @Post("appeals")
  submitAppeal(@CurrentUser() userId: string, @Body("reason") reason: string, @Body("supportingInfo") supportingInfo: string) {
    return this.adminStubs.submitAppeal(userId, reason, supportingInfo);
  }

  @Get("appeals")
  getAppeals(@Query("status") status?: string) { return this.adminStubs.getAppeals(status); }

  @Post("appeals/:userId/:index/resolve")
  resolveAppeal(
    @CurrentUser() adminId: string,
    @Param("userId") userId: string,
    @Param("index") index: string,
    @Body("decision") decision: string,
  ) { return this.adminStubs.resolveAppeal(adminId, userId, Number(index), decision); }

  // ─── F-735: Age verification config ──────────────────────────────────────
  @Get("age-verification-config")
  getAgeVerificationConfig() { return this.adminStubs.getAgeVerificationConfig(); }

  @Put("age-verification-config")
  setAgeVerificationConfig(@Body() config: Record<string, unknown>) { return this.adminStubs.setAgeVerificationConfig(config); }

  // ─── F-736: Geo-block work ────────────────────────────────────────────────
  @Put("works/:workId/geo-block")
  setWorkGeoBlock(@CurrentUser() adminId: string, @Param("workId") workId: string, @Body("blockedCountries") blockedCountries: string[]) {
    return this.adminStubs.setWorkGeoBlock(adminId, workId, blockedCountries);
  }

  // ─── F-737: IP geo-lookup ─────────────────────────────────────────────────
  @Get("ip-geo/:ip")
  getIpGeoLookup(@Param("ip") ip: string) { return this.adminStubs.getIpGeoLookup(ip); }

  // ─── F-738: Fraud score ───────────────────────────────────────────────────
  @Get("users/:userId/fraud-score")
  getUserFraudScore(@Param("userId") userId: string) { return this.adminStubs.getUserFraudScore(userId); }

  // ─── F-739: Chargebacks report (stub) ────────────────────────────────────
  @Get("chargebacks/detail")
  getChargebacksReportStub() { return this.adminStubs.getChargebacksReport(); }

  // ─── F-740: PEP/sanctions screening ──────────────────────────────────────
  @Get("users/:userId/pep-screening")
  getPepSanctionsScreening(@Param("userId") userId: string) { return this.adminStubs.getPepSanctionsScreening(userId); }

  @Post("users/:userId/pep-screening")
  runPepScreening(@CurrentUser() adminId: string, @Param("userId") userId: string) { return this.adminStubs.runPepScreening(adminId, userId); }

  // ─── F-745: Platform config-as-code ──────────────────────────────────────
  @Get("platform-config")
  getPlatformConfig() { return this.adminStubs.getPlatformConfig(); }

  @Put("platform-config/:key")
  setPlatformConfigKey(@CurrentUser() adminId: string, @Param("key") key: string, @Body("value") value: unknown) {
    return this.adminStubs.setPlatformConfigKey(adminId, key, value);
  }

  // ─── F-746: Backfill job trigger ─────────────────────────────────────────
  @Post("backfill")
  triggerBackfillJob(@CurrentUser() adminId: string, @Body("jobType") jobType: string, @Body("params") params: Record<string, unknown>) {
    return this.adminStubs.triggerBackfillJob(adminId, jobType, params);
  }

  // ─── F-747: Authority data export (GDPR Art. 58) ─────────────────────────
  @Post("users/:userId/authority-export")
  createAuthorityDataExport(
    @CurrentUser() adminId: string,
    @Param("userId") userId: string,
    @Body("requestedBy") requestedBy: string,
    @Body("legalBasis") legalBasis: string,
  ) { return this.adminStubs.createAuthorityDataExport(adminId, userId, requestedBy, legalBasis); }

  // ─── F-748: GDPR deletion log ─────────────────────────────────────────────
  @Get("gdpr/deletion-log")
  getDeletionLog() { return this.adminStubs.getDeletionLog(); }

  // ─── F-749: Retention policy ─────────────────────────────────────────────
  @Get("retention-policy")
  getRetentionPolicy() { return this.adminStubs.getRetentionPolicy(); }

  @Put("retention-policy")
  setRetentionPolicy(@CurrentUser() adminId: string, @Body() policy: Record<string, unknown>) { return this.adminStubs.setRetentionPolicy(adminId, policy); }

  // ─── F-750: DB backup status ─────────────────────────────────────────────
  @Get("db-backup-status")
  getDbBackupStatus() { return this.adminStubs.getDbBackupStatus(); }

  // ─── F-751: DR plan ──────────────────────────────────────────────────────
  @Get("dr-plan")
  getDisasterRecoveryPlan() { return this.adminStubs.getDisasterRecoveryPlan(); }

  // ─── F-752: Change management log ────────────────────────────────────────
  @Get("change-log")
  getChangeManagementLog() { return this.adminStubs.getChangeManagementLog(); }

  @Post("deployments")
  logDeployment(
    @CurrentUser() adminId: string,
    @Body("version") version: string,
    @Body("environment") environment: string,
    @Body("changeDescription") changeDescription: string,
  ) { return this.adminStubs.logDeployment(adminId, version, environment, changeDescription); }

  // ─── F-753: Release notes ─────────────────────────────────────────────────
  @Get("release-notes")
  getReleaseNotes() { return this.adminStubs.getReleaseNotes(); }

  // ─── F-754: Alerting config ──────────────────────────────────────────────
  @Get("alerting-config")
  getAlertingConfig() { return this.adminStubs.getAlertingConfig(); }

  @Put("alerting-config")
  setAlertingConfig(@CurrentUser() adminId: string, @Body() config: Record<string, unknown>) { return this.adminStubs.setAlertingConfig(adminId, config); }

  // ─── F-755: On-call rotation ─────────────────────────────────────────────
  @Get("on-call-rotation")
  getOnCallRotation() { return this.adminStubs.getOnCallRotation(); }

  @Put("on-call-rotation")
  setOnCallRotation(@CurrentUser() adminId: string, @Body("rotation") rotation: Array<{ userId: string; startDate: string; endDate: string }>) {
    return this.adminStubs.setOnCallRotation(adminId, rotation);
  }

  // ─── F-756: Runbooks ─────────────────────────────────────────────────────
  @Get("runbooks")
  getRunbooks() { return this.adminStubs.getRunbooks(); }

  // ─── F-757: Uptime monitoring config ─────────────────────────────────────
  @Get("uptime-monitoring")
  getUptimeMonitoringConfig() { return this.adminStubs.getUptimeMonitoringConfig(); }

  // ─── F-758: Synthetic monitoring ─────────────────────────────────────────
  @Get("synthetic-monitoring")
  getSyntheticMonitoringConfig() { return this.adminStubs.getSyntheticMonitoringConfig(); }

  // ─── F-759: Error budget ─────────────────────────────────────────────────
  @Get("error-budget")
  getErrorBudget() { return this.adminStubs.getErrorBudget(); }

  // ─── F-760: Platform stats CSV export (stub) ─────────────────────────────
  @Get("stats/export-csv")
  @Header("Content-Type", "text/csv")
  exportPlatformStatsCsvStub() { return this.adminStubs.exportPlatformStatsCsv(); }
}
