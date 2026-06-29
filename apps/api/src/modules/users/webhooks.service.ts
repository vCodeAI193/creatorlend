import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac, randomBytes } from 'node:crypto';

const MAX_BACKOFF_MS = 3600_000; // 1 hour

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

  /** Returns webhook delivery history (most recent 50). */
  async getDeliveries(userId: string) {
    // Filter deliveries by subscriptions belonging to this user
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { userId },
      select: { url: true },
    });
    const urls = subs.map((s) => s.url);
    return this.prisma.webhookDelivery.findMany({
      where: { targetUrl: { in: urls } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Retries failed (undelivered) webhook deliveries with exponential backoff.
   * A delivery is "failed" when succeededAt is null and attempts > 0.
   */
  async retryFailed() {
    const failed = await this.prisma.webhookDelivery.findMany({
      where: { succeededAt: null, attempts: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    let retried = 0;
    const now = new Date();

    for (const delivery of failed) {
      const backoffMs = Math.min(
        1000 * Math.pow(2, delivery.attempts - 1),
        MAX_BACKOFF_MS,
      );
      const nextAttemptAt = new Date(
        (delivery.lastAttemptAt ?? delivery.createdAt).getTime() + backoffMs,
      );

      if (nextAttemptAt > now) {
        // Not yet time to retry
        continue;
      }

      // Stub: in production, POST the payload to targetUrl with HMAC signature
      // Here we just increment attempts and record the attempt time
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { attempts: { increment: 1 }, lastAttemptAt: now },
      });
      retried++;
    }

    return { retried };
  }
}
