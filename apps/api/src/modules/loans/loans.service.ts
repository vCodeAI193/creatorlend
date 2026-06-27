import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DEFAULT_LOAN_DURATION_DAYS } from "@creatorlend/shared";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Kern-Logik des Leihmodells:
 * Ein Werk = eine Woche = eine faire Vergütung. Jede Ausleihe (und jede
 * Verlängerung) erzeugt ein PayoutItem für die/den Künstler:in.
 */
@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  private expiryFromNow(now: Date): Date {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + DEFAULT_LOAN_DURATION_DAYS);
    return expires;
  }

  /** Werk leihen: prüft Abo + Kontingent, legt Loan und Vergütung an. */
  async borrow(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") {
      throw new NotFoundException("work_not_found");
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription || subscription.status !== "ACTIVE") {
      throw new HttpException("no_active_subscription", HttpStatus.PAYMENT_REQUIRED);
    }
    if (subscription.loansUsedThisPeriod >= subscription.loanQuotaPerPeriod) {
      throw new ConflictException("quota_exceeded");
    }

    const existing = await this.prisma.loan.findFirst({
      where: { userId, workId, status: "ACTIVE" },
    });
    if (existing) {
      throw new ConflictException("already_borrowed");
    }

    const now = new Date();

    // Transaktional: Loan + Vergütung + Kontingent-Verbrauch.
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          userId,
          workId,
          status: "ACTIVE",
          startedAt: now,
          expiresAt: this.expiryFromNow(now),
        },
      });

      await tx.payoutItem.create({
        data: {
          artistId: work.artistId,
          loanId: loan.id,
          amountCents: work.loanPriceCents,
          status: "PENDING",
        },
      });

      await tx.subscription.update({
        where: { userId },
        data: { loansUsedThisPeriod: { increment: 1 } },
      });

      return loan;
    });
  }

  listForUser(userId: string, status?: string) {
    return this.prisma.loan.findMany({
      where: { userId, ...(status ? { status: status as never } : {}) },
      orderBy: { startedAt: "desc" },
    });
  }

  async getForUser(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    return loan;
  }

  /** Verlängern: +1 Woche und erneute Vergütung. */
  async renew(userId: string, id: string) {
    const loan = await this.getForUser(userId, id);
    if (loan.status === "EXCHANGED") {
      throw new BadRequestException("loan_not_renewable");
    }
    const work = await this.prisma.work.findUniqueOrThrow({
      where: { id: loan.workId },
    });
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: "ACTIVE",
          expiresAt: this.expiryFromNow(now),
          renewalCount: { increment: 1 },
        },
      });

      await tx.payoutItem.create({
        data: {
          artistId: work.artistId,
          loanId: loan.id,
          amountCents: work.loanPriceCents,
          status: "PENDING",
        },
      });

      return updated;
    });
  }

  /** Tauschen: aktuelle Ausleihe beenden, neues Werk leihen. */
  async exchange(userId: string, id: string, newWorkId: string) {
    const loan = await this.getForUser(userId, id);
    if (loan.status !== "ACTIVE") {
      throw new BadRequestException("loan_not_exchangeable");
    }

    await this.prisma.loan.update({
      where: { id: loan.id },
      data: { status: "EXCHANGED" },
    });

    const newLoan = await this.borrow(userId, newWorkId);
    return {
      previousLoan: { id: loan.id, status: "EXCHANGED" },
      newLoan,
    };
  }
}
