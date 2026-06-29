import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PromoCodesService } from "../promo-codes/promo-codes.service";
import { ReportsService } from "../reports/reports.service";
import { MailService } from "../mail/mail.service";

const PAGE_SIZE = 50;

/** Backoffice-Dienst für Admins (B-151, B-152, B-154, B-155). */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promoCodes: PromoCodesService,
    private readonly reports: ReportsService,
    private readonly mail: MailService,
  ) {}

  /** Nutzer:innen auflisten mit Paginierung und Filtern (F-381). */
  async listUsers(filters: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? PAGE_SIZE;
    const where: Record<string, unknown> = {};
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      (where as Record<string, unknown>)["OR"] = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { displayName: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.status === "suspended") {
      (where as Record<string, unknown>)["suspendedAt"] = { not: null };
    } else if (filters.status === "deleted") {
      (where as Record<string, unknown>)["deletedAt"] = { not: null };
    } else if (filters.status === "active") {
      (where as Record<string, unknown>)["suspendedAt"] = null;
      (where as Record<string, unknown>)["deletedAt"] = null;
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: where as never,
        select: {
          id: true, email: true, displayName: true, role: true,
          emailVerified: true, createdAt: true, suspendedAt: true, deletedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: where as never }),
    ]);
    return { users, meta: { page, pageSize: limit, total } };
  }

  private async writeAuditLog(actorId: string, action: string, targetType?: string, targetId?: string, meta?: object) {
    await this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId, meta } });
  }

  /** Audit-Log für einen bestimmten Nutzer auflisten (F-936). */
  async listUserAuditLog(userId: string, page = 1, limit = 50) {
    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { targetId: userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where: { targetId: userId } }),
    ]);
    return { entries, meta: { page, total } };
  }

  /** Audit-Log auflisten (B-155). */
  async listAuditLogs(page = 1, limit = 50) {
    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { entries, meta: { page, total } };
  }

  /** Nutzer:in Rolle setzen (F-382). */
  async setUserRole(adminId: string, userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("user_not_found");
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as never },
      select: { id: true, email: true, displayName: true, role: true },
    });
    await this.writeAuditLog(adminId, "SET_USER_ROLE", "User", userId, { role });
    return updated;
  }

  /** Admin: Abo manuell aktivieren (F-383). */
  async activateSubscription(userId: string, plan: string, durationDays: number) {
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const PLAN_QUOTA: Record<string, number> = { BASIC: 5, STANDARD: 10, PREMIUM: 30 };
    const quota = PLAN_QUOTA[plan] ?? 10;
    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: "ACTIVE",
        loanQuotaPerPeriod: quota,
        loansUsedThisPeriod: 0,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan,
        status: "ACTIVE",
        loanQuotaPerPeriod: quota,
        loansUsedThisPeriod: 0,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
    return sub;
  }

  /** Nutzer:in sperren (F-384). */
  async suspendUser(actorId: string, targetId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("user_not_found");
    // Tokens widerrufen + Passwort ungültig machen
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetId },
      data: { revokedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: "suspended", suspendedAt: new Date(), suspendReason: reason ?? null },
    });
    await this.writeAuditLog(actorId, "SUSPEND_USER", "User", targetId, { reason });
    return { suspended: true, userId: targetId };
  }

  /** Nutzer:in Sperre aufheben (F-384). */
  async unsuspendUser(actorId: string, targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("user_not_found");
    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: "requires_password_reset", suspendedAt: null, suspendReason: null },
    });
    await this.writeAuditLog(actorId, "UNSUSPEND_USER", "User", targetId);
    return { unsuspended: true, userId: targetId };
  }

  /** Werk genehmigen: status=PUBLISHED (F-385). */
  async approveWork(adminId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    const updated = await this.prisma.work.update({
      where: { id: workId },
      data: { status: "PUBLISHED" },
    });
    await this.writeAuditLog(adminId, "APPROVE_WORK", "Work", workId);
    return updated;
  }

  /** Werk ablehnen: status=DRAFT + E-Mail (F-385). */
  async rejectWork(adminId: string, workId: string, reason?: string) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      include: { artist: { select: { email: true, displayName: true } } },
    });
    if (!work) throw new NotFoundException("work_not_found");
    const updated = await this.prisma.work.update({
      where: { id: workId },
      data: { status: "DRAFT" },
    });
    // Send rejection email if available
    try {
      await this.mail.sendEmail(
        work.artist.email,
        "Dein Werk wurde abgelehnt",
        `Hallo ${work.artist.displayName},\n\ndein Werk „${work.title}" wurde abgelehnt.${reason ? `\n\nGrund: ${reason}` : ""}\n\nDu kannst das Werk überarbeiten und erneut einreichen.`,
      );
    } catch (_) {
      // non-critical
    }
    await this.writeAuditLog(adminId, "REJECT_WORK", "Work", workId, { reason });
    return updated;
  }

  /** Werk moderieren: depublizieren (B-152). */
  async moderateWork(actorId: string, workId: string, action: "unpublish" | "publish") {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    const status = action === "publish" ? "PUBLISHED" : "DRAFT";
    const updated = await this.prisma.work.update({ where: { id: workId }, data: { status } });
    await this.writeAuditLog(actorId, `MODERATE_WORK_${action.toUpperCase()}`, "Work", workId);
    return updated;
  }

  /** Rezension ausblenden – Moderations-Aktion (B-131). */
  async hideReview(actorId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("review_not_found");
    const updated = await this.prisma.review.update({ where: { id: reviewId }, data: { hidden: true } });
    await this.writeAuditLog(actorId, "HIDE_REVIEW", "Review", reviewId);
    return updated;
  }

  /** Admin: Promo-Code anlegen (B-087). */
  createPromoCode(input: { code: string; discountPercent?: number; discountCents?: number; plan?: string; maxUses?: number; expiresAt?: string }) {
    return this.promoCodes.create(input);
  }

  /** Admin: alle Promo-Codes auflisten (B-087). */
  listPromoCodes() {
    return this.promoCodes.list();
  }

  /** Admin: Meldungen auflisten (B-139, B-153). */
  listReports(page = 1, status?: string) {
    return this.reports.list(page, status);
  }

  /** Admin: Meldung bearbeiten (B-153). */
  reviewReport(adminId: string, reportId: string, action: "REVIEWED" | "DISMISSED") {
    return this.reports.review(adminId, reportId, action);
  }

  /** Admin-Notiz zu einem Nutzer anlegen (F-081). */
  async addNote(authorId: string, userId: string, body: string) {
    const note = await this.prisma.adminNote.create({
      data: { authorId, userId, body },
    });
    await this.writeAuditLog(authorId, "ADD_ADMIN_NOTE", "User", userId, { noteId: note.id });
    return note;
  }

  /** Admin-Notizen zu einem Nutzer auflisten (F-081). */
  async getNotes(userId: string) {
    return this.prisma.adminNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  /** Badge an Nutzer:in vergeben (F-065). */
  async awardBadge(actorId: string, userId: string, type: string) {
    const badge = await this.prisma.userBadge.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type },
      update: {},
    });
    await this.writeAuditLog(actorId, "AWARD_BADGE", "User", userId, { type });
    return badge;
  }

  // ─── F-390: Announcements ─────────────────────────────────────────────────

  /** Ankündigung erstellen (F-390). */
  async createAnnouncement(
    adminId: string,
    data: { title: string; body: string; type?: string; startsAt?: string; endsAt?: string },
  ) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        type: data.type ?? "INFO",
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        createdBy: adminId,
      },
    });
    await this.writeAuditLog(adminId, "CREATE_ANNOUNCEMENT", "Announcement", announcement.id);
    return announcement;
  }

  /** Ankündigungen auflisten (F-390). */
  async listAnnouncements(activeOnly = false) {
    const now = new Date();
    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.active = true;
      where["OR"] = [
        { startsAt: null },
        { startsAt: { lte: now } },
      ];
      // Also filter endsAt
    }
    const items = await this.prisma.announcement.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
    });
    if (activeOnly) {
      return items.filter((a) => !a.endsAt || a.endsAt > now);
    }
    return items;
  }

  /** Ankündigung löschen (F-390). */
  async deleteAnnouncement(id: string) {
    await this.prisma.announcement.delete({ where: { id } });
    return { deleted: true };
  }

  /** F-701: Webhook-Delivery-Log auflisten. */
  async listWebhookDeliveries(filters: { event?: string; from?: string; to?: string; failed?: boolean } = {}) {
    const where: any = {};
    if (filters.event) where.event = filters.event;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }
    if (filters.failed === true) where.succeededAt = null;
    const [items, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.webhookDelivery.count({ where }),
    ]);
    return { items, total };
  }

  /** F-701: Webhook-Delivery wiederholen. */
  async retryWebhookDelivery(id: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('delivery_not_found');
    await this.prisma.webhookDelivery.update({ where: { id }, data: { attempts: { increment: 1 }, lastAttemptAt: new Date() } });
    return { retried: true, id };
  }

  /** F-751: Werke-CSV-Export. */
  async exportWorksCsv(from?: string, to?: string): Promise<string> {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const works = await this.prisma.work.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        borrowCount: true,
        artist: { select: { displayName: true } },
        ratings: { select: { value: true } },
        loans: {
          select: {
            payoutItems: { where: { status: 'PAID' }, select: { amountCents: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const rows = works.map(w => {
      const totalEarnings = w.loans.flatMap(l => l.payoutItems).reduce((s: number, p: { amountCents: number }) => s + p.amountCents, 0);
      const avgRating = w.ratings.length > 0
        ? (w.ratings.reduce((s: number, r: { value: number }) => s + r.value, 0) / w.ratings.length).toFixed(2)
        : '';
      return [w.id, w.title.replace(/,/g, ';'), w.type, w.artist.displayName.replace(/,/g, ';'), w.borrowCount, totalEarnings, avgRating].join(',');
    });
    return ['workId,title,type,artistName,borrowCount,totalEarningsCents,avgRating', ...rows].join('\n');
  }

  /**
   * F-369: Export VAT data stub (ELSTER format).
   */
  exportVatData(year: number, quarter: number) {
    return {
      year,
      quarter,
      format: 'ELSTER',
      data: [],
      generatedAt: new Date(),
    };
  }

  /**
   * F-372: Set platform fee percent via AppSetting.
   */
  async setPlatformFee(percent: number) {
    return this.prisma.appSetting.upsert({
      where: { key: 'platform_fee_percent' },
      create: { key: 'platform_fee_percent', value: String(percent) },
      update: { value: String(percent) },
    });
  }

  /** Globale Plattform-Statistiken für das Dashboard (B-151). */
  async platformStats() {
    const [users, works, loans, pendingPayouts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.work.count({ where: { status: "PUBLISHED" } }),
      this.prisma.loan.count({ where: { status: "ACTIVE" } }),
      this.prisma.payoutItem.aggregate({
        where: { status: "PENDING" },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);
    return {
      totalUsers: users,
      publishedWorks: works,
      activeLoans: loans,
      pendingPayoutCents: pendingPayouts._sum.amountCents ?? 0,
      pendingPayoutItems: pendingPayouts._count,
    };
  }
}
