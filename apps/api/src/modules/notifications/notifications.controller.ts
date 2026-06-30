import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { NotificationsService } from "./notifications.service";
import { NotificationsStubsService } from "./notifications-stubs.service";

/** Öffentlicher Endpunkt: Abmelden via Token-Link aus E-Mail (B-125). */
@Controller("notifications")
export class NotificationsPublicController {
  constructor(private readonly notifications: NotificationsService) {}

  // GET /api/v1/notifications/unsubscribe?token=xxx – kein Auth erforderlich
  @Get("unsubscribe")
  unsubscribe(@Query("token") token: string) {
    return this.notifications.processUnsubscribeToken(token);
  }
}

/** In-App-Benachrichtigungen (für alle eingeloggten Nutzer:innen). */
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly stubs: NotificationsStubsService,
  ) {}

  // GET /api/v1/notifications?unread=true&type=LOAN_EXPIRED
  @Get()
  list(
    @CurrentUser() userId: string,
    @Query("unread") unread?: string,
    @Query("type") type?: string,
  ) {
    return this.notifications.list(userId, unread === "true", type);
  }

  // GET /api/v1/notifications/unread-count (F-403)
  @Get("unread-count")
  async unreadCount(@CurrentUser() userId: string) {
    return this.notifications.countUnread(userId);
  }

  // POST /api/v1/notifications/:id/read
  @Post(":id/read")
  markRead(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.notifications.markRead(userId, id);
  }

  // POST /api/v1/notifications/read-all
  @Post("read-all")
  markAllRead(@CurrentUser() userId: string) {
    return this.notifications.markAllRead(userId);
  }

  // POST /api/v1/notifications/mark-all-read (F-403)
  @Post("mark-all-read")
  markAllReadV2(@CurrentUser() userId: string) {
    return this.notifications.markAllReadV2(userId);
  }

  // GET /api/v1/notifications/preferences – eigene Präferenzen (B-028)
  @Get("preferences")
  getPreferences(@CurrentUser() userId: string) {
    return this.notifications.getPreferences(userId);
  }

  // PUT /api/v1/notifications/preferences – Präferenzen setzen (B-028)
  @Put("preferences")
  updatePreferences(
    @CurrentUser() userId: string,
    @Body() updates: Record<string, boolean>,
  ) {
    return this.notifications.updatePreferences(userId, updates);
  }

  // PATCH /api/v1/notifications/:id/archive – archivieren (F-673)
  @Patch(":id/archive")
  archiveNotification(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.notifications.archiveNotification(userId, id);
  }

  // PUT /api/v1/notifications/digest-mode – Digest-Modus setzen (F-642)
  @Put("digest-mode")
  setDigestMode(@CurrentUser() userId: string, @Body("mode") mode: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY' | null) {
    return this.notifications.setDigestMode(userId, mode);
  }

  // PUT /api/v1/notifications/quiet-hours – Stille Stunden setzen (F-643)
  @Put("quiet-hours")
  setQuietHours(
    @CurrentUser() userId: string,
    @Body("start") start: number | null,
    @Body("end") end: number | null,
  ) {
    return this.notifications.setQuietHours(userId, start, end);
  }

  // GET /api/v1/notifications/log – Benachrichtigungs-Log (F-670)
  @Get("log")
  getNotificationLog(
    @CurrentUser() userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.notifications.getNotificationLog(userId, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  // GET /api/v1/notifications/search?q=... – Suche (F-674)
  @Get("search")
  searchNotifications(@CurrentUser() userId: string, @Query("q") q: string) {
    return this.notifications.searchNotifications(userId, q ?? '');
  }

  // POST /api/v1/notifications/:id/pin – Anpinnen (F-675)
  @Post(":id/pin")
  pinNotification(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.notifications.pinNotification(userId, id);
  }

  // DELETE /api/v1/notifications/:id/pin – Anpinnen entfernen (F-675)
  @Delete(":id/pin")
  unpinNotification(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.notifications.unpinNotification(userId, id);
  }

  // GET /api/v1/notifications/grouped – Benachrichtigungs-Grouping (F-641)
  @Get("grouped")
  grouped(@CurrentUser() userId: string) {
    return this.notifications.getGrouped(userId);
  }

  // GET /api/v1/notifications/web-push/config – VAPID public key (F-650)
  @Get("web-push/config")
  webPushConfig() {
    return this.notifications.getWebPushConfig();
  }

  // POST /api/v1/notifications/web-push/subscribe – Browser-Push-Subscription speichern (F-650)
  @Post("web-push/subscribe")
  subscribePush(@CurrentUser() userId: string, @Body() subscription: Record<string, unknown>) {
    return this.notifications.savePushSubscription(userId, subscription);
  }

  // DELETE /api/v1/notifications/web-push/unsubscribe – Subscription entfernen (F-650)
  @Delete("web-push/unsubscribe")
  unsubscribePush(@CurrentUser() userId: string, @Body("endpoint") endpoint: string) {
    return this.notifications.removePushSubscription(userId, endpoint);
  }

  // ─── F-646–649: External integrations ────────────────────────────────────

  @Get("integrations/slack")
  getSlackConfig(@CurrentUser() userId: string) {
    return this.stubs.getSlackIntegrationConfig(userId);
  }

  @Put("integrations/slack")
  setSlackConfig(@CurrentUser() userId: string, @Body("webhookUrl") webhookUrl: string, @Body("channel") channel: string) {
    return this.stubs.setSlackIntegrationConfig(userId, webhookUrl, channel);
  }

  @Get("integrations/discord")
  getDiscordConfig(@CurrentUser() userId: string) {
    return this.stubs.getDiscordIntegrationConfig(userId);
  }

  @Put("integrations/discord")
  setDiscordConfig(@CurrentUser() userId: string, @Body("webhookUrl") webhookUrl: string) {
    return this.stubs.setDiscordIntegrationConfig(userId, webhookUrl);
  }

  @Get("integrations/telegram")
  getTelegramConfig(@CurrentUser() userId: string) {
    return this.stubs.getTelegramBotConfig(userId);
  }

  @Post("integrations/telegram/connect")
  connectTelegram(@CurrentUser() userId: string, @Body("chatId") chatId: string) {
    return this.stubs.connectTelegramBot(userId, chatId);
  }

  @Get("integrations/sms")
  getSmsConfig(@CurrentUser() userId: string) {
    return this.stubs.getSmsNotificationConfig(userId);
  }

  @Put("integrations/sms")
  setSmsConfig(@CurrentUser() userId: string, @Body("phone") phone: string, @Body("types") types: string[]) {
    return this.stubs.setSmsNotificationConfig(userId, phone, types);
  }

  // ─── F-651, F-665: Email config ───────────────────────────────────────────

  @Get("email/templates")
  getEmailTemplateConfig() {
    return this.stubs.getEmailTemplateConfig();
  }

  @Get("email/dns-security")
  getDnsSecurityConfig() {
    return this.stubs.getDnsSecurityConfig();
  }

  // ─── F-666–669: Email analytics & sequences ──────────────────────────────

  @Get("email/analytics")
  getEmailAnalytics(@Query("period") period: string) {
    return this.stubs.getEmailAnalytics(period);
  }

  @Get("email/ab-tests")
  getEmailAbTests() {
    return this.stubs.getEmailAbTests();
  }

  @Post("email/ab-tests")
  createEmailAbTest(@Body("templateId") templateId: string, @Body("variants") variants: Array<{ subject: string; weight: number }>) {
    return this.stubs.createEmailAbTest(templateId, variants);
  }

  @Get("email/sequences")
  getEmailSequences() {
    return this.stubs.getEmailSequences();
  }

  @Post("email/sequences/:sequenceId/enroll")
  enrollInSequence(@CurrentUser() userId: string, @Param("sequenceId") sequenceId: string) {
    return this.stubs.enrollUserInSequence(userId, sequenceId);
  }

  @Get("email/sequences/:sequenceId/status")
  getSequenceStatus(@CurrentUser() userId: string, @Param("sequenceId") sequenceId: string) {
    return this.stubs.getSequenceEnrollmentStatus(userId, sequenceId);
  }

  // ─── F-676–678: Push notification config ─────────────────────────────────

  @Get("push/rich-config")
  getRichPushConfig(@CurrentUser() userId: string) {
    return this.stubs.getRichPushConfig(userId);
  }

  @Put("push/rich-config")
  setRichPushConfig(@CurrentUser() userId: string, @Body() config: Record<string, unknown>) {
    return this.stubs.setRichPushConfig(userId, config);
  }

  @Get("push/actionable-config")
  getActionablePushConfig(@CurrentUser() userId: string) {
    return this.stubs.getActionablePushConfig(userId);
  }

  @Put("push/actionable-config")
  setActionablePushConfig(@CurrentUser() userId: string, @Body() config: Record<string, unknown>) {
    return this.stubs.setActionablePushConfig(userId, config);
  }

  @Get("push/widget-config")
  getNotificationWidgetConfig() {
    return this.stubs.getNotificationWidgetConfig();
  }

  // ─── F-679–690: Notification type definitions ────────────────────────────

  @Get("types")
  getNotificationTypeDefinitions() {
    return this.stubs.getNotificationTypeDefinitions();
  }

  @Post("types/trigger")
  triggerNotificationType(
    @CurrentUser() userId: string,
    @Body("type") type: string,
    @Body("data") data: Record<string, unknown>,
  ) {
    return this.stubs.triggerNotificationType(userId, type, data);
  }

  // ─── F-696–699: Status page & incidents ─────────────────────────────────

  @Get("status")
  getPlatformStatus() {
    return this.stubs.getPlatformStatus();
  }

  @Get("maintenance")
  getMaintenanceBanner() {
    return this.stubs.getMaintenanceBanner();
  }

  @Put("maintenance")
  setMaintenanceBanner(
    @Body("enabled") enabled: boolean,
    @Body("message") message: string,
    @Body("eta") eta: string,
  ) {
    return this.stubs.setMaintenanceBanner(enabled, message, eta);
  }

  @Post("incidents")
  createIncident(
    @Body("title") title: string,
    @Body("description") description: string,
    @Body("affectedServices") affectedServices: string[],
  ) {
    return this.stubs.createIncident(title, description, affectedServices);
  }

  @Post("incidents/:incidentId/resolve")
  resolveIncident(@Param("incidentId") incidentId: string, @Body("resolution") resolution: string) {
    return this.stubs.resolveIncident(incidentId, resolution);
  }

  @Get("postmortems")
  getPostmortems() {
    return this.stubs.getPostmortems();
  }

  @Post("postmortems")
  createPostmortem(
    @Body("incidentId") incidentId: string,
    @Body("title") title: string,
    @Body("timeline") timeline: string,
    @Body("rootCause") rootCause: string,
    @Body("actionItems") actionItems: string[],
  ) {
    return this.stubs.createPostmortem(incidentId, title, timeline, rootCause, actionItems);
  }

  @Post("postmortems/:postmortemId/publish")
  publishPostmortem(@Param("postmortemId") postmortemId: string) {
    return this.stubs.publishPostmortem(postmortemId);
  }

  // F-667: Notification analytics
  @Get("analytics")
  getNotificationAnalytics() {
    return this.stubs.getNotificationAnalytics();
  }
}
