import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/v1/metrics – Prometheus-Format (F-919)
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    const [userCount, workCount, loanCount, subCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.work.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.loan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    const lines = [
      '# HELP creatorlend_users_total Total registered users',
      '# TYPE creatorlend_users_total gauge',
      `creatorlend_users_total ${userCount}`,
      '',
      '# HELP creatorlend_works_published_total Published works',
      '# TYPE creatorlend_works_published_total gauge',
      `creatorlend_works_published_total ${workCount}`,
      '',
      '# HELP creatorlend_loans_active_total Currently active loans',
      '# TYPE creatorlend_loans_active_total gauge',
      `creatorlend_loans_active_total ${loanCount}`,
      '',
      '# HELP creatorlend_subscriptions_active_total Active subscriptions',
      '# TYPE creatorlend_subscriptions_active_total gauge',
      `creatorlend_subscriptions_active_total ${subCount}`,
    ];
    return lines.join('\n');
  }
}
