import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsScheduler {
  constructor(private readonly prisma: PrismaService) {}

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
}
