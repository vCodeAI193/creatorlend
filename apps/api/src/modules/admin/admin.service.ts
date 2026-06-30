import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
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
    private readonly jwt: JwtService,
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

  // ─── F-133: Featured works ────────────────────────────────────────────────

  /** Werk als Featured markieren (F-133). */
  async featureWork(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    return this.prisma.work.update({ where: { id: workId }, data: { isFeatured: true, featuredAt: new Date() } });
  }

  /** Featured-Markierung entfernen (F-133). */
  async unfeatureWork(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    return this.prisma.work.update({ where: { id: workId }, data: { isFeatured: false, featuredAt: null } });
  }

  /** Featured-Werke auflisten (F-133). */
  async getFeaturedWorks() {
    return this.prisma.work.findMany({ where: { isFeatured: true }, orderBy: { featuredAt: 'desc' } });
  }

  // F-391: Betrug-Verdacht auf PayoutItem markieren / aufheben
  async flagPayoutItem(payoutItemId: string, flagged: boolean) {
    const item = await this.prisma.payoutItem.findUnique({ where: { id: payoutItemId } });
    if (!item) throw new NotFoundException('payout_item_not_found');
    return this.prisma.payoutItem.update({
      where: { id: payoutItemId },
      data: { flaggedForFraud: flagged },
    });
  }

  // F-391: Alle verdächtigen Auszahlungen auflisten
  async listFlaggedPayouts() {
    return this.prisma.payoutItem.findMany({
      where: { flaggedForFraud: true },
      include: { artist: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // F-721: Meldung einem Support-Agent zuweisen
  async assignReport(reportId: string, assigneeId: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { assigneeId, status: 'IN_PROGRESS' },
    });
  }

  // F-722: Meldungs-Status aktualisieren
  async updateReportStatus(reportId: string, status: string, resolvedBy?: string, reviewNote?: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolvedBy: resolvedBy ?? undefined,
        reviewNote: reviewNote ?? undefined,
        reviewedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : undefined,
      },
    });
  }

  // F-720: Meldungs-Queue priorisiert abrufen
  async getReportQueue(status?: string) {
    const where = status ? { status } : { status: { in: ['OPEN', 'IN_PROGRESS'] } };
    return this.prisma.report.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
  }

  // F-709/710/711/712: Erweitertes Admin-Dashboard mit Zeitraum-Aufschlüsselung
  async getDashboardMetrics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      usersToday, usersThisWeek, usersThisMonth,
      revenueToday, revenueThisWeek, revenueThisMonth,
      activeLoans, reportQueueCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.payoutItem.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { amountCents: true } }),
      this.prisma.payoutItem.aggregate({ where: { createdAt: { gte: weekStart } }, _sum: { amountCents: true } }),
      this.prisma.payoutItem.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amountCents: true } }),
      this.prisma.loan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.report.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    return {
      newUsers: { today: usersToday, week: usersThisWeek, month: usersThisMonth },
      revenue: {
        todayCents: revenueToday._sum.amountCents ?? 0,
        weekCents: revenueThisWeek._sum.amountCents ?? 0,
        monthCents: revenueThisMonth._sum.amountCents ?? 0,
      },
      activeLoans,
      reportQueueCount,
    };
  }

  // F-715: Nutzer:in-Impersonation (Token generieren)
  async impersonateUser(adminId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('user_not_found');
    await this.writeAuditLog(adminId, 'IMPERSONATE_USER', 'User', targetUserId);
    const token = this.jwt.sign(
      { sub: target.id, role: target.role, impersonatedBy: adminId },
      { expiresIn: '1h' },
    );
    return { token, expiresIn: 3600, targetUserId, targetEmail: target.email };
  }

  // F-717: Admin-Tags setzen
  async setUserTags(adminId: string, userId: string, tags: string[]) {
    await this.writeAuditLog(adminId, 'SET_USER_TAGS', 'User', userId, { tags });
    return this.prisma.user.update({ where: { id: userId }, data: { adminTags: tags }, select: { id: true, adminTags: true } });
  }

  // F-717: Nutzer:innen nach Tag filtern
  async getUsersByTag(tag: string) {
    return this.prisma.user.findMany({
      where: { adminTags: { has: tag } },
      select: { id: true, email: true, displayName: true, adminTags: true, role: true },
    });
  }

  // F-718: Massen-E-Mail an gefiltertes Segment
  async sendMassEmail(filter: { role?: string; tag?: string }, subject: string, body: string) {
    const where: Record<string, unknown> = {};
    if (filter.role) where['role'] = filter.role;
    if (filter.tag) where['adminTags'] = { has: filter.tag };
    const users = await this.prisma.user.findMany({ where, select: { email: true } });
    let sent = 0;
    for (const user of users) {
      await this.mail.sendEmail(user.email, subject, body).catch(() => {});
      sent++;
    }
    return { sent };
  }

  // F-738: Betrugs-Score setzen
  async setUserFraudScore(adminId: string, userId: string, score: number) {
    await this.writeAuditLog(adminId, 'SET_FRAUD_SCORE', 'User', userId, { score });
    return this.prisma.user.update({ where: { id: userId }, data: { fraudScore: score }, select: { id: true, fraudScore: true } });
  }

  // F-738: Nutzer:innen mit erhöhtem Betrugs-Score
  async listHighFraudUsers(minScore = 50) {
    return this.prisma.user.findMany({
      where: { fraudScore: { gte: minScore } },
      select: { id: true, email: true, displayName: true, fraudScore: true, adminTags: true },
      orderBy: { fraudScore: 'desc' },
    });
  }

  // F-742: Maintenance-Modus aktivieren / deaktivieren via Announcement
  async setMaintenanceMode(active: boolean, message?: string, adminId?: string) {
    if (active) {
      const ann = await this.prisma.announcement.create({
        data: {
          title: 'Wartungsarbeiten',
          body: message ?? 'Die Plattform ist kurzzeitig nicht verfügbar.',
          type: 'MAINTENANCE',
          active: true,
          createdBy: adminId ?? 'system',
        },
      });
      return { maintenanceMode: true, announcementId: ann.id };
    } else {
      await this.prisma.announcement.updateMany({
        where: { type: 'MAINTENANCE', active: true },
        data: { active: false },
      });
      return { maintenanceMode: false };
    }
  }

  // F-778: DAU/WAU/MAU
  async getDAUWAUMAU() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [dau, wau, mau] = await Promise.all([
      this.prisma.loan.groupBy({ by: ['userId'], where: { createdAt: { gte: dayAgo } }, _count: true }).then(r => r.length),
      this.prisma.loan.groupBy({ by: ['userId'], where: { createdAt: { gte: weekAgo } }, _count: true }).then(r => r.length),
      this.prisma.loan.groupBy({ by: ['userId'], where: { createdAt: { gte: monthAgo } }, _count: true }).then(r => r.length),
    ]);
    return { dau, wau, mau, stickyFactor: mau > 0 ? Math.round((dau / mau) * 100) / 100 : 0 };
  }

  // F-770: MRR / ARR
  async getMRRARR() {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenue = await this.prisma.payoutItem.aggregate({
      where: { createdAt: { gte: monthAgo } },
      _sum: { amountCents: true },
    });
    const totalAmountCents = revenue._sum.amountCents ?? 0;
    // Platform revenue = total / (1 - fee). We get 30%, so platform = payout / 0.7 * 0.3
    const platformShareCents = Math.round(totalAmountCents / 0.7 * 0.3);
    const mrrCents = totalAmountCents + platformShareCents;
    return { mrrCents, arrCents: mrrCents * 12, artistEarningsCents: totalAmountCents };
  }

  // F-723: Auto-Assign Meldungen nach Kategorie
  async autoAssignReports() {
    const openReports = await this.prisma.report.findMany({
      where: { status: 'OPEN', assigneeId: null },
      select: { id: true, reason: true },
      take: 50,
    });
    // Assign by round-robin to admin users (simplified: just update to IN_PROGRESS)
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true }, take: 5 });
    if (admins.length === 0) return { assigned: 0 };
    let count = 0;
    for (const report of openReports) {
      const admin = admins[count % admins.length];
      await this.prisma.report.update({ where: { id: report.id }, data: { assigneeId: admin.id, status: 'IN_PROGRESS' } });
      count++;
    }
    return { assigned: count };
  }

  // F-749: Retention-Policy – veraltete Daten löschen
  async runRetentionPolicyCleanup(retentionYears = 3) {
    const cutoff = new Date(Date.now() - retentionYears * 365 * 24 * 60 * 60 * 1000);
    const [deletedLogs, deletedNotifs] = await Promise.all([
      this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      this.prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff }, archivedAt: { not: null } } }),
    ]);
    return { deletedAuditLogs: deletedLogs.count, deletedNotifications: deletedNotifs.count };
  }

  // F-760: Plattform-Statistiken als CSV exportieren
  async exportPlatformStatsCsv(): Promise<string> {
    const stats = await this.platformStats();
    const dashboard = await this.getDashboardMetrics();
    const mrrArr = await this.getMRRARR();
    const lines = [
      'metric,value',
      `totalUsers,${stats.totalUsers}`,
      `publishedWorks,${stats.publishedWorks}`,
      `activeLoans,${stats.activeLoans}`,
      `pendingPayoutCents,${stats.pendingPayoutCents}`,
      `newUsersToday,${dashboard.newUsers.today}`,
      `newUsersWeek,${dashboard.newUsers.week}`,
      `newUsersMonth,${dashboard.newUsers.month}`,
      `revenueTodayCents,${dashboard.revenue.todayCents}`,
      `revenueWeekCents,${dashboard.revenue.weekCents}`,
      `revenueMonthCents,${dashboard.revenue.monthCents}`,
      `mrrCents,${mrrArr.mrrCents}`,
      `arrCents,${mrrArr.arrCents}`,
      `reportQueueCount,${dashboard.reportQueueCount}`,
    ];
    return lines.join('\n');
  }

  // F-724: Meldung eskalieren
  async escalateReport(id: string, level: number, adminId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('report_not_found');
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'ESCALATE_REPORT', targetId: id, targetType: 'Report', meta: { level } },
    });
    return this.prisma.report.update({ where: { id }, data: { escalationLevel: level } });
  }

  // F-725: Content-Moderations-Warteschlange (Werke mit explicit-Flag oder ageRating in Review)
  async contentModerationQueue() {
    return this.prisma.work.findMany({
      where: { status: 'DRAFT', explicit: true },
      select: { id: true, title: true, artistId: true, createdAt: true, explicit: true, ageRating: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // F-726 stub: hash-based image check (stub)
  async hashCheckWork(workId: string) {
    return { workId, checked: true, match: false, stub: true };
  }

  // F-732: Verstoß verarbeiten (3 strikes → suspend)
  async processViolation(adminId: string, userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { strikeCount: true, suspendedAt: true } });
    if (!user) throw new NotFoundException('user_not_found');
    const newCount = user.strikeCount + 1;
    const updates: { strikeCount: number; suspendedAt?: Date } = { strikeCount: newCount };
    if (newCount >= 3 && !user.suspendedAt) {
      updates.suspendedAt = new Date();
    }
    await this.prisma.user.update({ where: { id: userId }, data: updates });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'PROCESS_VIOLATION', targetId: userId, targetType: 'User', meta: { reason, strikeCount: newCount } },
    });
    return { userId, strikeCount: newCount, suspended: newCount >= 3 };
  }

  // F-733: Verwarnung ausstellen
  async issueWarning(adminId: string, userId: string, reason: string, deadlineHours?: number) {
    const deadline = deadlineHours ? new Date(Date.now() + deadlineHours * 60 * 60 * 1000) : undefined;
    const warning = await this.prisma.userWarning.create({
      data: { userId, reason, adminId, deadline },
    });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'ISSUE_WARNING', targetId: userId, targetType: 'User', meta: { reason, deadlineHours } },
    });
    return warning;
  }

  async listWarnings(userId: string) {
    return this.prisma.userWarning.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  // F-734: Appeal-Prozess
  async submitAppeal(userId: string, reason: string) {
    return this.prisma.appealRequest.create({ data: { userId, reason } });
  }

  async listAppeals(status?: string) {
    return this.prisma.appealRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'asc' },
    });
  }

  async processAppeal(adminId: string, id: string, status: 'APPROVED' | 'REJECTED', adminNote?: string) {
    const appeal = await this.prisma.appealRequest.findUnique({ where: { id } });
    if (!appeal) throw new NotFoundException('appeal_not_found');
    if (status === 'APPROVED') {
      await this.prisma.user.update({ where: { id: appeal.userId }, data: { suspendedAt: null, strikeCount: 0 } });
    }
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'PROCESS_APPEAL', targetId: id, targetType: 'AppealRequest', meta: { status, adminNote } },
    });
    return this.prisma.appealRequest.update({ where: { id }, data: { status, adminNote } });
  }

  // F-736: Geo-Block
  async geoBlockWork(adminId: string, workId: string, countries: string[]) {
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'GEO_BLOCK_WORK', targetId: workId, targetType: 'Work', meta: { countries } },
    });
    return this.prisma.work.update({ where: { id: workId }, data: { geoBlock: countries } });
  }

  // F-739: Chargebacks-Report
  async getChargebacksReport() {
    const items = await this.prisma.payoutItem.findMany({
      where: { flaggedForFraud: true },
      include: { artist: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const totalCents = items.reduce((s, i) => s + i.amountCents, 0);
    return { count: items.length, totalCents, items };
  }

  // F-740 stub: PEP/Sanctions screening
  async pepSanctionsCheck(userId: string) {
    return { userId, matched: false, stub: true, checkedAt: new Date() };
  }

  // F-716: Admin-Notiz hinzufügen
  async addUserNote(authorId: string, userId: string, body: string) {
    await this.writeAuditLog(authorId, 'ADD_USER_NOTE', 'User', userId, { body: body.slice(0, 100) });
    return this.prisma.adminNote.create({ data: { userId, authorId, body } });
  }

  // F-716: Admin-Notizen eines Nutzers abrufen
  async getUserNotes(userId: string) {
    return this.prisma.adminNote.findMany({
      where: { userId },
      include: { author: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // F-716: Admin-Notiz löschen
  async deleteUserNote(adminId: string, noteId: string) {
    await this.writeAuditLog(adminId, 'DELETE_USER_NOTE', 'AdminNote', noteId, {});
    return this.prisma.adminNote.delete({ where: { id: noteId } });
  }

  // F-719: Promo-Code massenweise an Nutzersegment vergeben
  async massDistributePromoCode(adminId: string, codeId: string, filter: { role?: string; tag?: string }) {
    const where: Record<string, unknown> = {};
    if (filter.role) where['role'] = filter.role;
    if (filter.tag) where['adminTags'] = { has: filter.tag };
    const users = await this.prisma.user.findMany({ where, select: { id: true, email: true } });
    let distributed = 0;
    for (const user of users) {
      try {
        await this.promoCodes.redeem(codeId, user.id).catch(() => {});
        distributed++;
      } catch { /* skip already redeemed */ }
    }
    await this.writeAuditLog(adminId, 'MASS_PROMO_CODE', 'PromoCode', codeId, { filter, distributed });
    return { distributed, userCount: users.length };
  }

  // F-727 stub: Audio-Copyright-Screening
  async audioCopyrightScreening(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { id: true, title: true } });
    if (!work) return { workId, error: 'work_not_found' };
    return {
      workId,
      title: work.title,
      screened: true,
      matchFound: false,
      stub: true,
      message: 'Production: integrate AcoustID / Audible Magic / ContentID API',
      checkedAt: new Date(),
    };
  }

  // F-731: DMCA Counter-Notice einreichen
  async submitDmcaCounterNotice(workId: string, artistId: string, statement: string, takedownId: string) {
    const takedown = await this.prisma.dmcaTakedown.findUnique({ where: { id: takedownId } });
    if (!takedown) throw new Error('takedown_not_found');
    await this.prisma.dmcaTakedown.update({
      where: { id: takedownId },
      data: { status: 'COUNTER_NOTICE', adminNote: `Counter-notice by ${artistId}: ${statement}` },
    });
    await this.mail.sendEmail(
      process.env.ADMIN_EMAIL ?? 'admin@creatorlend.com',
      `[DMCA] Counter-Notice für Takedown ${takedownId}`,
      `Künstler:in ${artistId} widerspricht dem Takedown:\n${statement}`,
    );
    return { submitted: true, takedownId, status: 'COUNTER_NOTICE' };
  }

  // F-379: Pressekopie-Code für Journalist:innen (Admin erstellt 100%-Rabatt-Code)
  async createPressCode(adminId: string, code: string, workId: string, expiresAt?: string) {
    const result = await this.promoCodes.createPressCode(code, workId, expiresAt);
    await this.writeAuditLog(adminId, 'CREATE_PRESS_CODE', 'Work', workId, { code });
    return result;
  }

  // F-746: Backfill-Job per Admin auslösen (stub – in prod via BullMQ)
  async triggerBackfill(jobName: string, adminId: string, params: Record<string, unknown> = {}) {
    const allowedJobs = ['fix-payout-amounts', 'reindex-search', 'recalculate-loan-quotas', 'sync-subscription-status', 'rebuild-recommendations'];
    if (!allowedJobs.includes(jobName)) throw new Error(`unknown_job: ${jobName}. Allowed: ${allowedJobs.join(', ')}`);
    await this.writeAuditLog(adminId, 'BACKFILL_JOB', 'System', jobName, { params });
    return { jobName, params, queued: true, stub: true, allowedJobs, message: 'Production: submit to BullMQ job queue' };
  }

  // F-695: Platform-FAQ (in-memory store)
  private platformFaqs: Array<{ id: string; category: string; question: string; answer: string; sortOrder: number }> = [
    { id: '1', category: 'general', question: 'Was ist CreatorLend?', answer: 'CreatorLend ist eine Plattform, auf der Künstler:innen ihre Werke verleihen und Hörer:innen diese zeitlich begrenzt ausleihen können.', sortOrder: 0 },
    { id: '2', category: 'loans', question: 'Wie lange kann ich ein Werk ausleihen?', answer: 'Werke werden standardmäßig für 7 Tage ausgeliehen. Du kannst die Leihe einmalig verlängern.', sortOrder: 1 },
    { id: '3', category: 'billing', question: 'Welche Abonnement-Pläne gibt es?', answer: 'Es gibt FREE, STANDARD und PREMIUM Pläne mit unterschiedlichen Ausleihkontingenten.', sortOrder: 2 },
    { id: '4', category: 'artists', question: 'Wie werden Künstler:innen vergütet?', answer: 'Künstler:innen erhalten 70 % der Ausleihgebühr. Auszahlungen erfolgen monatlich.', sortOrder: 3 },
    { id: '5', category: 'support', question: 'Wie erreiche ich den Support?', answer: 'Du kannst ein Support-Ticket über POST /api/v1/support einreichen.', sortOrder: 4 },
  ];

  searchPlatformFaqs(query?: string, category?: string) {
    let results = [...this.platformFaqs];
    if (category) results = results.filter((f) => f.category === category);
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  upsertPlatformFaq(id: string | undefined, data: { category: string; question: string; answer: string; sortOrder?: number }) {
    const existing = id ? this.platformFaqs.find((f) => f.id === id) : null;
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    const newId = String(Date.now());
    const faq = { id: newId, sortOrder: 0, ...data };
    this.platformFaqs.push(faq);
    return faq;
  }

  deletePlatformFaq(id: string) {
    const index = this.platformFaqs.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('faq_not_found');
    this.platformFaqs.splice(index, 1);
    return { deleted: true, id };
  }

  // F-698: Incident-E-Mail an alle aktiven Nutzer:innen senden
  async sendIncidentEmail(subject: string, body: string, adminId: string) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { email: true },
      take: 5000,
    });
    let sent = 0;
    for (const user of users) {
      await this.mail.sendEmail(user.email, `[Statusmeldung] ${subject}`, body).catch(() => {});
      sent++;
    }
    await this.writeAuditLog(adminId, 'INCIDENT_EMAIL', 'System', 'all', { subject, recipientCount: sent });
    return { sent, subject };
  }

  // F-702: Admin-Sub-Rollen verwalten (via adminTags)
  async setSubRole(adminId: string, userId: string, subRole: string, active: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { adminTags: true } });
    if (!user) throw new Error('user_not_found');
    const currentTags = user.adminTags ?? [];
    const tags = active
      ? currentTags.includes(subRole) ? currentTags : [...currentTags, subRole]
      : currentTags.filter((t) => t !== subRole);
    await this.prisma.user.update({ where: { id: userId }, data: { adminTags: tags } });
    await this.writeAuditLog(adminId, active ? 'SUB_ROLE_GRANT' : 'SUB_ROLE_REVOKE', 'User', userId, { subRole });
    return { userId, subRole, active, adminTags: tags };
  }

  async listSubRoles(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { adminTags: true } });
    if (!user) throw new Error('user_not_found');
    const SUB_ROLES = ['SUPPORT', 'MODERATOR', 'REVIEWER', 'FINANCE'];
    const assigned = (user.adminTags ?? []).filter((t) => SUB_ROLES.includes(t));
    return { userId, subRoles: assigned };
  }
}
