import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const PAGE_SIZE = 50;

/** Backoffice-Dienst für Admins (B-151, B-152, B-154, B-155). */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Nutzer:innen auflisten mit Paginierung. */
  async listUsers(page: number, role?: string) {
    const where = role ? { role: role as never } : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, email: true, displayName: true, role: true, emailVerified: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, meta: { page, pageSize: PAGE_SIZE, total } };
  }

  private async writeAuditLog(actorId: string, action: string, targetType?: string, targetId?: string, meta?: object) {
    await this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId, meta } });
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

  /** Nutzer:in sperren – anonymisiert das Konto (B-154). */
  async suspendUser(actorId: string, targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("user_not_found");
    // Tokens widerrufen + Passwort ungültig machen
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetId },
      data: { revokedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: "suspended" },
    });
    await this.writeAuditLog(actorId, "SUSPEND_USER", "User", targetId);
    return { suspended: true, userId: targetId };
  }

  /** Nutzer:in reaktivieren – setzt Passwort-Hash auf Reset-Anforderung (B-154). */
  async unsuspendUser(actorId: string, targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("user_not_found");
    await this.prisma.user.update({
      where: { id: targetId },
      // Setzt Hash zurück; Nutzer:in muss Passwort zurücksetzen.
      data: { passwordHash: "requires_password_reset" },
    });
    await this.writeAuditLog(actorId, "UNSUSPEND_USER", "User", targetId);
    return { unsuspended: true, userId: targetId };
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
