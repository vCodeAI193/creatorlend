import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async recordConsent(userId: string, type: string, version: string, granted: boolean, ip?: string) {
    return this.prisma.consentRecord.create({
      data: { userId, type, version, granted, ip },
    });
  }

  async getConsentHistory(userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** @deprecated use getConsentHistory */
  async getHistory(userId: string) {
    return this.getConsentHistory(userId);
  }

  async getLatestConsent(userId: string, type: string) {
    return this.prisma.consentRecord.findFirst({
      where: { userId, type },
      orderBy: { createdAt: "desc" },
    });
  }

  async withdrawConsent(userId: string, type: string) {
    return this.prisma.consentRecord.create({
      data: { userId, type, version: "withdrawal", granted: false },
    });
  }

  /** @deprecated use withdrawConsent */
  async withdraw(userId: string, type: string) {
    return this.withdrawConsent(userId, type);
  }
}
