import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { NotificationsService } from "./notifications.service";

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
  constructor(private readonly notifications: NotificationsService) {}

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
}
