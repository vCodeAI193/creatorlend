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
}
