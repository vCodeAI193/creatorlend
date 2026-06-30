import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";
import { SubscriptionsService } from "./subscriptions.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly mail: MailService,
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
   * F-654: Sendet zusätzlich eine E-Mail-Erinnerung.
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
      select: { userId: true, currentPeriodEnd: true, plan: true },
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
        const user = await this.prisma.user.findUnique({ where: { id: sub.userId }, select: { email: true, displayName: true } });
        if (user && sub.currentPeriodEnd) {
          await this.mail.sendSubscriptionRenewalReminder(user.email, user.displayName, sub.currentPeriodEnd, sub.plan ?? 'Standard');
        }
        notified += 1;
      } catch (err) {
        this.logger.error(`Renewal-Erinnerung für ${sub.userId} fehlgeschlagen`, err);
      }
    }
    this.logger.log(`Renewal-Erinnerungen: ${notified} Benachrichtigungen gesendet`);
  }

  /**
   * F-419: Preiserhöhungs-Ankündigung 30 Tage vorher.
   * Läuft täglich um 10 Uhr. Sendet E-Mail wenn PRICE_INCREASE_DATE (ISO) gesetzt
   * und heute genau 30 Tage davor liegt (±12h Fenster).
   */
  @Cron('0 10 * * *')
  async handlePriceIncreaseNotification() {
    const priceIncreaseDate = process.env.PRICE_INCREASE_DATE;
    const newPriceCents = Number(process.env.PRICE_INCREASE_AMOUNT_CENTS ?? '0');
    if (!priceIncreaseDate || !newPriceCents) return;

    const effectiveDate = new Date(priceIncreaseDate);
    const now = new Date();
    const diff = effectiveDate.getTime() - now.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Math.abs(diff - thirtyDays) > 12 * 60 * 60 * 1000) return;

    const activeSubscribers = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { userId: true },
    });

    let sent = 0;
    for (const sub of activeSubscribers) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: sub.userId }, select: { email: true, displayName: true } });
        if (user) {
          await this.mail.sendPriceIncreaseNotification(user.email, user.displayName, newPriceCents, effectiveDate);
          sent += 1;
        }
      } catch (err) {
        this.logger.error(`Preiserhöhungs-E-Mail für ${sub.userId} fehlgeschlagen`, err);
      }
    }
    if (sent > 0) {
      this.logger.log(`Preiserhöhungs-Ankündigungen: ${sent} E-Mails gesendet`);
    }
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

  /**
   * F-351: Quota rollover – täglich Mitternacht: findet alle ACTIVE Abos,
   * deren currentPeriodEnd < now, und setzt das Kontingent zurück.
   */
  @Cron('0 0 * * *')
  async handleQuotaRollover() {
    const now = new Date();
    const expiredSubs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
      select: { id: true },
    });
    let rolledOver = 0;
    for (const sub of expiredSubs) {
      try {
        await this.subscriptions.rolloverQuota(sub.id);
        rolledOver += 1;
      } catch (err) {
        this.logger.error(`Quota rollover failed for subscription ${sub.id}`, err);
      }
    }
    if (rolledOver > 0) {
      this.logger.log(`Quota rollover: ${rolledOver} subscriptions reset`);
    }
  }
}
