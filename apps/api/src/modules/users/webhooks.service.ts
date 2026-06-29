import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac, randomBytes } from 'node:crypto';

@Injectable()
export class WebhooksSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, url: string, events: string[]) {
    const secret = randomBytes(32).toString('hex');
    const sub = await this.prisma.webhookSubscription.create({
      data: { userId, url, events, secret },
    });
    return { ...sub, secret }; // Return secret once
  }

  async list(userId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { userId },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });
  }

  async delete(userId: string, id: string) {
    const sub = await this.prisma.webhookSubscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('subscription_not_found');
    if (sub.userId !== userId) throw new ForbiddenException('not_your_subscription');
    await this.prisma.webhookSubscription.delete({ where: { id } });
    return { deleted: true };
  }

  async dispatch(event: string, payload: Record<string, unknown>) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { active: true, events: { has: event } },
    });
    // Stub: log dispatch attempt
    for (const sub of subs) {
      const sig = createHmac('sha256', sub.secret).update(JSON.stringify(payload)).digest('hex');
      await this.prisma.webhookDelivery.create({
        data: { event, payload: payload as any, targetUrl: sub.url, attempts: 1, lastAttemptAt: new Date() },
      });
      // In production: HTTP POST with X-Signature: sig header
      void sig;
    }
    return { dispatched: subs.length };
  }
}
