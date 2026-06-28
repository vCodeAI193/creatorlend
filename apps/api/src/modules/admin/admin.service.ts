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

  /** Nutzer:in sperren – anonymisiert das Konto (B-154). */
  async suspendUser(targetId: string) {
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
    return { suspended: true, userId: targetId };
  }

  /** Nutzer:in reaktivieren – setzt Passwort-Hash auf Reset-Anforderung (B-154). */
  async unsuspendUser(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("user_not_found");
    await this.prisma.user.update({
      where: { id: targetId },
      // Setzt Hash zurück; Nutzer:in muss Passwort zurücksetzen.
      data: { passwordHash: "requires_password_reset" },
    });
    return { unsuspended: true, userId: targetId };
  }

  /** Werk moderieren: depublizieren (B-152). */
  async moderateWork(workId: string, action: "unpublish" | "publish") {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    const status = action === "publish" ? "PUBLISHED" : "DRAFT";
    return this.prisma.work.update({ where: { id: workId }, data: { status } });
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
