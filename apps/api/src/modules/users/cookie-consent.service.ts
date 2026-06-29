import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CookieConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async setConsent(
    sessionId: string,
    analytics: boolean,
    marketing: boolean,
    functional: boolean,
    userId?: string,
    ip?: string,
  ) {
    if (userId) {
      const existing = await this.prisma.cookieConsent.findFirst({ where: { userId } });
      if (existing) {
        return this.prisma.cookieConsent.update({
          where: { id: existing.id },
          data: { analytics, marketing, functional, ip, sessionId },
        });
      }
      return this.prisma.cookieConsent.create({
        data: { userId, sessionId, analytics, marketing, functional, ip },
      });
    }
    // For anonymous users, upsert by sessionId
    const existing = await this.prisma.cookieConsent.findFirst({ where: { sessionId } });
    if (existing) {
      return this.prisma.cookieConsent.update({
        where: { id: existing.id },
        data: { analytics, marketing, functional, ip },
      });
    }
    return this.prisma.cookieConsent.create({
      data: { sessionId, analytics, marketing, functional, ip },
    });
  }

  async getConsent(userId?: string, sessionId?: string) {
    if (userId) {
      return this.prisma.cookieConsent.findFirst({ where: { userId } });
    }
    if (sessionId) {
      return this.prisma.cookieConsent.findFirst({ where: { sessionId } });
    }
    return null;
  }

  async exportConsents(userId: string) {
    return this.prisma.cookieConsent.findMany({ where: { userId } });
  }
}
