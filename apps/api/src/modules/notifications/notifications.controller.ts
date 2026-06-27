import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { NotificationsService } from "./notifications.service";

/** In-App-Benachrichtigungen (für alle eingeloggten Nutzer:innen). */
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // GET /api/v1/notifications?unread=true
  @Get()
  list(@CurrentUser() userId: string, @Query("unread") unread?: string) {
    return this.notifications.list(userId, unread === "true");
  }

  // GET /api/v1/notifications/unread-count
  @Get("unread-count")
  async unreadCount(@CurrentUser() userId: string) {
    return { count: await this.notifications.unreadCount(userId) };
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
}
