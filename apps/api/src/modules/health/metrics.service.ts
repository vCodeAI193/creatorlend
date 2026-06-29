import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async collect() {
    const [users, works, loans, subs] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.work.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.loan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);
    const lines = [
      '# HELP creatorlend_users_total Total registered users',
      '# TYPE creatorlend_users_total gauge',
      `creatorlend_users_total ${users}`,
      '# HELP creatorlend_works_published Published works',
      '# TYPE creatorlend_works_published gauge',
      `creatorlend_works_published ${works}`,
      '# HELP creatorlend_loans_active Active loans',
      '# TYPE creatorlend_loans_active gauge',
      `creatorlend_loans_active ${loans}`,
      '# HELP creatorlend_subscriptions_active Active subscriptions',
      '# TYPE creatorlend_subscriptions_active gauge',
      `creatorlend_subscriptions_active ${subs}`,
    ];
    return lines.join('\n') + '\n';
  }
}
