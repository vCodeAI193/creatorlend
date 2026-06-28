import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Dunning: benachrichtigt Nutzer mit PAST_DUE-Abo stündlich (B-098). */
  @Cron(CronExpression.EVERY_HOUR)
  async handleDunning() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pastDue = await this.prisma.subscription.findMany({
      where: { status: "PAST_DUE" },
      select: { userId: true },
    });

    let notified = 0;
    for (const sub of pastDue) {
      const alreadyNotified = await this.prisma.notification.findFirst({
        where: { userId: sub.userId, type: "DUNNING", createdAt: { gte: since } },
      });
      if (alreadyNotified) continue;
      await this.notifications.create({
        userId: sub.userId,
        type: "DUNNING",
        title: "Zahlung ausstehend",
        body: "Deine Zahlung ist überfällig. Bitte aktualisiere deine Zahlungsmethode.",
      });
      notified += 1;
    }
    this.logger.log(`Dunning: ${notified} Benachrichtigungen gesendet`);
  }
}
