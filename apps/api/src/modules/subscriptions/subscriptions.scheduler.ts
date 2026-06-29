import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";
import { SubscriptionsService } from "./subscriptions.service";

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
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

  /**
   * F-418: Erneuerungs-Erinnerung 7 Tage vor Ablauf des aktuellen Abo-Zeitraums.
   * Läuft täglich um 9 Uhr und benachrichtigt Nutzer:innen, deren Abo in
   * ~7 Tagen abläuft (Fenster: 7 Tage ± 30 Minuten).
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleRenewalReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000);

    const expiringSoon = await this.prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: { gte: windowStart, lte: windowEnd },
      },
      select: { userId: true, currentPeriodEnd: true },
    });

    let notified = 0;
    for (const sub of expiringSoon) {
      try {
        await this.notifications.create({
          userId: sub.userId,
          type: NotificationType.SUBSCRIPTION_RENEWAL,
          title: "Dein Abonnement verlängert sich bald",
          body: `Dein Abonnement wird in 7 Tagen automatisch verlängert.`,
          data: { renewalDate: sub.currentPeriodEnd },
        });
        notified += 1;
      } catch (err) {
        this.logger.error(`Renewal-Erinnerung für ${sub.userId} fehlgeschlagen`, err);
      }
    }
    this.logger.log(`Renewal-Erinnerungen: ${notified} Benachrichtigungen gesendet`);
  }

  /** Auto-Resume pausierter Abos (F-529): läuft stündlich. */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoResume() {
    const result = await this.subscriptions.autoResumePaused();
    if (result.resumed > 0) {
      this.logger.log(`Auto-Resume: ${result.resumed} Abos reaktiviert`);
    }
  }

  /** F-510: Dunning – retry failed payments daily. */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleRetryFailedPayments() {
    const result = await this.subscriptions.retryFailedPayments();
    if (result.processed > 0) {
      this.logger.log(`Dunning retry: processed ${result.processed} PAST_DUE subscriptions`);
    }
  }
}
