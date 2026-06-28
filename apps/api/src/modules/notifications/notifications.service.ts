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
}
