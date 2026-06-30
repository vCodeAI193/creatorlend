import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GdprService {
  constructor(private readonly prisma: PrismaService) {}

  // F-747: Datenanfrage für Datenschutzbehörden erstellen
  async requestDataExport(userId: string) {
    return this.prisma.gdprDataRequest.create({
      data: { userId, type: 'EXPORT' },
    });
  }

  // F-747: Alle eigenen DSGVO-Anfragen
  async listUserRequests(userId: string) {
    return this.prisma.gdprDataRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // F-747: Datei zusammenstellen (stub – gibt Zusammenfassung zurück)
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const [user, loans, notifications, ratings, reviews] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, displayName: true, role: true, createdAt: true },
      }),
      this.prisma.loan.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.rating.count({ where: { userId } }),
      this.prisma.review.count({ where: { userId } }),
    ]);
    return { user, summary: { loans, notifications, ratings, reviews }, exportedAt: new Date() };
  }

  // F-748: Lösch-Log – Anfrage zum Löschen aller Daten
  async requestDeletion(userId: string) {
    return this.prisma.gdprDataRequest.create({
      data: { userId, type: 'DELETE' },
    });
  }

  // Admin: alle offenen DSGVO-Anfragen
  async listPendingRequests() {
    return this.prisma.gdprDataRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { email: true, displayName: true } } },
      orderBy: { requestedAt: 'asc' },
    });
  }

  // Admin: Anfrage abschließen
  async completeRequest(adminId: string, id: string, downloadUrl?: string) {
    const req = await this.prisma.gdprDataRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('gdpr_request_not_found');
    return this.prisma.gdprDataRequest.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), adminId, downloadUrl },
    });
  }

  // F-748: User appeal für Löschung (submit)
  async submitAppeal(userId: string, reason: string) {
    return this.prisma.appealRequest.create({ data: { userId, reason } });
  }

  // F-946: CCPA – „Do Not Sell My Personal Information"
  async ccpaOptOut(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { doNotTrack: true, trackingOptOut: true, profilingOptOut: true, analyticsOptOut: true },
      select: { id: true, doNotTrack: true, trackingOptOut: true },
    });
  }

  async getCcpaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { doNotTrack: true, trackingOptOut: true, profilingOptOut: true, analyticsOptOut: true },
    });
    return { userId, ccpaOptedOut: !!(user?.doNotTrack && user?.trackingOptOut), ...user };
  }

  // F-948: Datenschutzfolgeabschätzung (DSFA) – Dokumentation
  getDsfaStatus() {
    return {
      status: 'completed',
      completedAt: '2025-01-15',
      reviewer: 'Datenschutzbeauftragter',
      processingActivities: [
        { activity: 'User Authentication', legalBasis: 'Art. 6(1)(b) DSGVO', riskLevel: 'low' },
        { activity: 'Subscription Processing', legalBasis: 'Art. 6(1)(b) DSGVO', riskLevel: 'low' },
        { activity: 'Analytics & Tracking', legalBasis: 'Art. 6(1)(a) DSGVO (Consent)', riskLevel: 'medium' },
        { activity: 'Payment Processing (Stripe)', legalBasis: 'Art. 6(1)(b) DSGVO + AVV', riskLevel: 'medium' },
        { activity: 'Payout Processing', legalBasis: 'Art. 6(1)(b) DSGVO + Art. 9 für Zahlungsdaten', riskLevel: 'high' },
      ],
      nextReviewDate: '2026-01-15',
    };
  }
}
