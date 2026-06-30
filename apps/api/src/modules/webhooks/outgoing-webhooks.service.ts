import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHmac } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OutgoingWebhooksService {
  private readonly logger = new Logger(OutgoingWebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // F-884: HMAC-Signatur berechnen
  private sign(secret: string, payload: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }

  // F-883: Outgoing Webhook an alle Subscriber senden
  async dispatch(event: string, data: Record<string, unknown>) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: { active: true, events: { has: event } },
    });
    for (const sub of subs) {
      const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      const signature = this.sign(sub.secret, payload);
      await this.prisma.outgoingWebhookDelivery.create({
        data: {
          subscriptionId: sub.id,
          event,
          payload: data as Prisma.InputJsonValue,
          signature,
          nextRetryAt: new Date(),
        },
      });
    }
  }

  // F-885: Retry mit exponentiellem Backoff (jede Minute prüfen)
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingDeliveries() {
    const now = new Date();
    const pending = await this.prisma.outgoingWebhookDelivery.findMany({
      where: { succeededAt: null, nextRetryAt: { lte: now }, attempts: { lt: 5 } },
      take: 50,
    });

    for (const delivery of pending) {
      const sub = await this.prisma.webhookSubscription.findUnique({
        where: { id: delivery.subscriptionId },
      });
      if (!sub || !sub.active) continue;

      const payload = JSON.stringify({ event: delivery.event, data: delivery.payload, timestamp: delivery.createdAt });
      let statusCode: number | null = null;
      let errorMessage: string | null = null;
      let succeededAt: Date | null = null;

      try {
        const resp = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CreatorLend-Signature': delivery.signature ?? '',
            'X-CreatorLend-Event': delivery.event,
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });
        statusCode = resp.status;
        if (resp.ok) succeededAt = new Date();
      } catch (err: unknown) {
        errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Webhook delivery ${delivery.id} failed: ${errorMessage}`);
      }

      // Exponential backoff: 1m, 5m, 30m, 3h, 24h
      const backoffMinutes = [1, 5, 30, 180, 1440];
      const nextAttempt = delivery.attempts < 4
        ? new Date(Date.now() + backoffMinutes[delivery.attempts] * 60_000)
        : null;

      await this.prisma.outgoingWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: delivery.attempts + 1,
          statusCode,
          errorMessage,
          succeededAt,
          nextRetryAt: succeededAt ? null : nextAttempt,
        },
      });
    }
  }

  // F-876: Delivery-Logs für eine Subscription
  async listDeliveries(subscriptionId: string, limit = 50) {
    return this.prisma.outgoingWebhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // F-883: Subscriptions verwalten
  async subscribe(userId: string, url: string, events: string[]) {
    const { randomBytes } = await import('crypto');
    const secret = randomBytes(32).toString('hex');
    return this.prisma.webhookSubscription.create({
      data: { userId, url, events, secret },
    });
  }

  async listSubscriptions(userId: string) {
    return this.prisma.webhookSubscription.findMany({ where: { userId } });
  }

  async deleteSubscription(userId: string, id: string) {
    return this.prisma.webhookSubscription.deleteMany({ where: { id, userId } });
  }
}
