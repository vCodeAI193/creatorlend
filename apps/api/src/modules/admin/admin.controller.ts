import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { AdminService } from "./admin.service";
import { DmcaService } from "./dmca.service";
import { FeatureFlagsService } from "./feature-flags.service";
import { AnalyticsService } from "./analytics.service";

/** Admin-Backoffice (B-151, B-152, B-154, B-155). Nur für ADMIN-Rolle. */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly dmca: DmcaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly analytics: AnalyticsService,
  ) {}

  // GET /api/v1/admin/stats – Plattform-Übersicht
  @Get("stats")
  stats() {
    return this.admin.platformStats();
  }

  // GET /api/v1/admin/users?role=ARTIST&page=1
  @Get("users")
  listUsers(@Query("page") page = "1", @Query("role") role?: string) {
    return this.admin.listUsers(Number(page), role);
  }

  // POST /api/v1/admin/users/:id/suspend – Nutzer:in sperren (B-154)
  @Post("users/:id/suspend")
  suspend(@CurrentUser() actorId: string, @Param("id") id: string) {
    return this.admin.suspendUser(actorId, id);
  }

  // POST /api/v1/admin/users/:id/unsuspend – Sperre aufheben (B-154)
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

  // GET /api/v1/admin/audit-log – Audit-Log (B-155)
  @Get("audit-log")
  auditLog(@Query("page") page = "1", @Query("limit") limit = "50") {
    return this.admin.listAuditLogs(Number(page), Number(limit));
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
}
