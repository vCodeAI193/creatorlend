import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });
  }

  /** Erzeugt viele Benachrichtigungen in einem Rutsch (z. B. Ablauf-Sweep). */
  createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        data: i.data,
      })),
    });
  }

  list(userId: string, onlyUnread = false, type?: string) {
    return this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { readAt: null } : {}), ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException("notification_not_found");
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // B-028: Benachrichtigungspräferenzen ─────────────────────────────────────

  /** Liefert alle Präferenzen eines Nutzers (Typen ohne Eintrag = aktiviert). */
  async getPreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    return prefs;
  }

  /**
   * Setzt mehrere Präferenzen auf einmal.
   * Eingabe: Record<type, boolean>, z. B. { LOAN_EXPIRING: false }
   */
  async updatePreferences(userId: string, updates: Record<string, boolean>) {
    const results = await Promise.all(
      Object.entries(updates).map(([type, enabled]) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_type: { userId, type } },
          create: { userId, type, enabled },
          update: { enabled },
        }),
      ),
    );
    return results;
  }

  /**
   * Prüft, ob ein bestimmter Benachrichtigungstyp für einen Nutzer aktiviert
   * ist. Unbekannte Typen (kein Eintrag) gelten als aktiviert.
   */
  async isEnabled(userId: string, type: string): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    return pref?.enabled ?? true;
  }

  /**
   * Benachrichtigung nur senden, wenn der Typ für den Nutzer nicht deaktiviert
   * wurde (B-028). Ersetzt direkten Aufruf von create() in anderen Services.
   */
  async createIfEnabled(input: CreateNotificationInput) {
    const enabled = await this.isEnabled(input.userId, input.type);
    if (!enabled) return null;
    return this.create(input);
  }

  /** Generiert einen Abmelde-Token (B-125). */
  async generateUnsubscribeToken(userId: string, type?: string) {
    return this.prisma.unsubscribeToken.create({
      data: { userId, type },
    });
  }

  /** Verarbeitet einen Abmelde-Token und deaktiviert die Benachrichtigung (B-125). */
  async processUnsubscribeToken(token: string) {
    const record = await this.prisma.unsubscribeToken.findUnique({ where: { token } });
    if (!record) throw new NotFoundException("invalid_token");
    if (record.usedAt) throw new BadRequestException("token_already_used");
    await this.prisma.unsubscribeToken.update({ where: { token }, data: { usedAt: new Date() } });
    if (record.type) {
      await this.updatePreferences(record.userId, { [record.type]: false });
    } else {
      // Alle Benachrichtigungstypen deaktivieren
      const allTypes = await this.prisma.notificationPreference.findMany({
        where: { userId: record.userId },
        select: { type: true },
      });
      const updates: Record<string, boolean> = {};
      for (const p of allTypes) updates[p.type] = false;
      if (Object.keys(updates).length > 0) {
        await this.updatePreferences(record.userId, updates);
      }
    }
    return { unsubscribed: true, type: record.type ?? "all" };
  }

  /** F-407: Abmelden per Token (Alias für processUnsubscribeToken). */
  async unsubscribeByToken(token: string) {
    return this.processUnsubscribeToken(token);
  }

  // ─── F-403: Unread count / mark all read ─────────────────────────────────

  /** F-403: Anzahl ungelesener Benachrichtigungen zurückgeben. */
  async countUnread(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unread };
  }

  /** F-403: Alle Benachrichtigungen als gelesen markieren. */
  async markAllReadV2(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ─── F-401: Email digest ──────────────────────────────────────────────────

  /**
   * Collects recent notifications for a user and returns them as digest content.
   * In MVP: returns notification list (actual email sending is a stub).
   */
  async sendDigest(userId: string, frequency: string) {
    const since = frequency === "WEEKLY"
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // DAILY

    const notifications = await this.prisma.notification.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // In MVP, just log — real email sending would use MailService
    console.log(`[Digest] Sending ${frequency} digest to ${userId}: ${notifications.length} notifications`);
    return { userId, frequency, notificationCount: notifications.length };
  }

  /** F-401: Find users with daily digest and send digests. */
  async scheduleDigests() {
    const users = await this.prisma.user.findMany({
      where: { notifDigestMode: "DAILY" },
      select: { id: true },
    });
    for (const user of users) {
      await this.sendDigest(user.id, "DAILY");
    }
    return { processed: users.length };
  }

  // F-673: Benachrichtigung archivieren
  async archiveNotification(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('notification_not_found');
    return this.prisma.notification.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  // F-673: Alle älteren als 30 Tage archivieren (via scheduler)
  async archiveOldNotifications() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notification.updateMany({
      where: { archivedAt: null, createdAt: { lt: cutoff } },
      data: { archivedAt: new Date() },
    });
    return { archived: result.count };
  }

  // F-643: Benachrichtigung unter Berücksichtigung stiller Stunden anlegen
  async createWithQuietHoursCheck(input: { userId: string; type: string; title: string; body?: string; data?: Prisma.InputJsonValue }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { quietHoursStart: true, quietHoursEnd: true },
    });
    if (user?.quietHoursStart != null && user?.quietHoursEnd != null) {
      const hour = new Date().getUTCHours();
      const start = user.quietHoursStart;
      const end = user.quietHoursEnd;
      const inQuiet = start <= end ? hour >= start && hour < end : hour >= start || hour < end;
      if (inQuiet) return null; // Skip during quiet hours
    }
    return this.create(input);
  }

  // F-642: Digest-Modus setzen
  async setDigestMode(userId: string, mode: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY' | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { notifDigestMode: mode },
      select: { id: true, notifDigestMode: true },
    });
  }

  // F-643: Stille Stunden setzen
  async setQuietHours(userId: string, start: number | null, end: number | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { quietHoursStart: start, quietHoursEnd: end },
      select: { id: true, quietHoursStart: true, quietHoursEnd: true },
    });
  }

  // F-670: Benachrichtigungs-Log (alle versendeten Nachrichten)
  async getNotificationLog(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  // F-674: Suche in Benachrichtigungen
  async searchNotifications(userId: string, query: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // F-675: Benachrichtigung anpinnen
  async pinNotification(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('notification_not_found');
    return this.prisma.notification.update({ where: { id }, data: { pinnedAt: new Date() } });
  }

  async unpinNotification(userId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('notification_not_found');
    return this.prisma.notification.update({ where: { id }, data: { pinnedAt: null } });
  }

  // F-650: Web Push API – VAPID public key
  getWebPushConfig() {
    return {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? 'REPLACE_WITH_VAPID_PUBLIC_KEY',
      applicationServerKey: process.env.VAPID_PUBLIC_KEY ?? 'REPLACE_WITH_VAPID_PUBLIC_KEY',
      message: 'Generate VAPID keys with: npx web-push generate-vapid-keys',
    };
  }

  // F-650: Store browser push subscription
  async savePushSubscription(userId: string, subscription: Record<string, unknown>) {
    // Store subscription in user metadata (production: dedicated PushSubscription table)
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { socialLinks: true },
    });
    const meta = (existing?.socialLinks as Record<string, unknown>) ?? {};
    const subs: unknown[] = Array.isArray(meta._pushSubscriptions) ? (meta._pushSubscriptions as unknown[]) : [];
    const endpoint = subscription['endpoint'] as string;
    const filtered = subs.filter((s) => (s as Record<string, unknown>)['endpoint'] !== endpoint);
    filtered.push({ ...subscription, savedAt: new Date().toISOString() });
    await this.prisma.user.update({
      where: { id: userId },
      data: { socialLinks: { ...meta, _pushSubscriptions: filtered } as Prisma.InputJsonValue },
    });
    return { success: true, message: 'push_subscription_saved' };
  }

  // F-650: Remove browser push subscription
  async removePushSubscription(userId: string, endpoint: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { socialLinks: true },
    });
    const meta = (existing?.socialLinks as Record<string, unknown>) ?? {};
    const subs: unknown[] = Array.isArray(meta._pushSubscriptions) ? (meta._pushSubscriptions as unknown[]) : [];
    const filtered = subs.filter((s) => (s as Record<string, unknown>)['endpoint'] !== endpoint);
    await this.prisma.user.update({
      where: { id: userId },
      data: { socialLinks: { ...meta, _pushSubscriptions: filtered } as Prisma.InputJsonValue },
    });
    return { success: true, message: 'push_subscription_removed' };
  }

  // F-641: Benachrichtigungs-Grouping – bündelt gleichartige Notifs der letzten Stunde
  async getGrouped(userId: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.notification.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    const groups: Record<string, { type: string; count: number; latest: string; ids: string[] }> = {};
    for (const n of recent) {
      if (!groups[n.type]) {
        groups[n.type] = { type: n.type, count: 0, latest: n.title, ids: [] };
      }
      groups[n.type].count++;
      groups[n.type].ids.push(n.id);
    }
    const older = await this.prisma.notification.findMany({
      where: { userId, createdAt: { lt: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { grouped: Object.values(groups), older };
  }
}
