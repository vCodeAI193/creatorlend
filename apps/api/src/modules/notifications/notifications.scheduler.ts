import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.magicLink.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await this.prisma.refreshToken.deleteMany({ where: { revokedAt: { lt: cutoff } } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireLoans() {
    await this.prisma.loan.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  /**
   * F-262: 48-Stunden-Erinnerung vor Ablauf (täglich um 09:00).
   */
  @Cron('0 9 * * *')
  async sendRenewalReminders() {
    const now = new Date();
    const in47h = new Date(now.getTime() + 47 * 60 * 60 * 1000);
    const in49h = new Date(now.getTime() + 49 * 60 * 60 * 1000);
    const loans = await this.prisma.loan.findMany({
      where: { status: 'ACTIVE', expiresAt: { gte: in47h, lte: in49h } },
      select: { id: true, userId: true, workId: true },
    });
    for (const loan of loans) {
      await this.notifications.create({
        userId: loan.userId,
        type: 'LOAN_EXPIRING',
        title: 'Loan expiring soon',
        body: 'Your loan expires in 48 hours',
        data: { loanId: loan.id, workId: loan.workId },
      });
    }
  }
}
