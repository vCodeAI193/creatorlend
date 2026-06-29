import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification-types';

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

  // F-262: 48-Stunden-Erinnerung vor Ablauf (täglich um 09:00)
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
        type: NotificationType.LOAN_EXPIRING,
        title: 'Leihe läuft bald ab',
        body: 'Deine Leihe läuft in 48 Stunden ab',
        data: { loanId: loan.id, workId: loan.workId },
      });
    }
  }

  // F-418: Abo-Verlängerungs-Erinnerung 7 Tage vorher (täglich um 10:00)
  @Cron('0 10 * * *')
  async sendSubscriptionRenewalReminders() {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in8d = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const subs = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gte: in7d, lte: in8d },
      },
      select: { userId: true, plan: true, currentPeriodEnd: true },
    });
    for (const sub of subs) {
      await this.notifications.create({
        userId: sub.userId,
        type: NotificationType.SUBSCRIPTION_RENEWAL,
        title: 'Abo verlängert sich in 7 Tagen',
        body: `Dein ${sub.plan}-Abo verlängert sich am ${sub.currentPeriodEnd?.toLocaleDateString('de')}.`,
        data: { plan: sub.plan },
      });
    }
  }

  // F-495: Wöchentlicher Einnahmen-Report für Künstler:innen (montags um 08:00)
  @Cron('0 8 * * 1')
  async sendWeeklyReports() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const artists = await this.prisma.user.findMany({
      where: { role: 'ARTIST' },
      select: { id: true },
    });
    for (const artist of artists) {
      const items = await this.prisma.payoutItem.findMany({
        where: { artistId: artist.id, createdAt: { gte: weekAgo } },
        select: { amountCents: true },
      });
      if (items.length === 0) continue;
      const totalCents = items.reduce((sum, i) => sum + i.amountCents, 0);
      await this.notifications.create({
        userId: artist.id,
        type: 'WEEKLY_REPORT',
        title: 'Dein wöchentlicher Report',
        body: `Diese Woche: ${items.length} Ausleihen, ${(totalCents / 100).toFixed(2)} € Einnahmen.`,
        data: { loanCount: items.length, earningsCents: totalCents, period: 'weekly' },
      });
    }
  }

  // F-496: Monatlicher Performance-Bericht (1. des Monats um 08:00)
  @Cron('0 8 1 * *')
  async sendMonthlyReports() {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const artists = await this.prisma.user.findMany({
      where: { role: 'ARTIST' },
      select: { id: true },
    });
    for (const artist of artists) {
      const items = await this.prisma.payoutItem.findMany({
        where: { artistId: artist.id, createdAt: { gte: monthAgo } },
        select: { amountCents: true },
      });
      const totalCents = items.reduce((sum, i) => sum + i.amountCents, 0);
      const newFollowers = await this.prisma.follow.count({
        where: { artistId: artist.id, createdAt: { gte: monthAgo } },
      });
      await this.notifications.create({
        userId: artist.id,
        type: 'MONTHLY_REPORT',
        title: 'Dein monatlicher Bericht',
        body: `Letzter Monat: ${items.length} Ausleihen, ${(totalCents / 100).toFixed(2)} €, +${newFollowers} Follower.`,
        data: { loanCount: items.length, earningsCents: totalCents, newFollowers, period: 'monthly' },
      });
    }
  }

  // F-673: Benachrichtigungen älter als 30 Tage archivieren (täglich um Mitternacht)
  @Cron('30 0 * * *')
  async archiveOldNotifications() {
    await this.notifications.archiveOldNotifications();
  }

  // F-655: Re-Engagement nach 30 Tagen Inaktivität (täglich um 11:00)
  @Cron('0 11 * * *')
  async sendReEngagementNotifications() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const inactiveUsers = await this.prisma.user.findMany({
      where: {
        role: 'LISTENER',
        loans: {
          some: { createdAt: { gte: thirtyOneDaysAgo, lte: thirtyDaysAgo } },
          none: { createdAt: { gt: thirtyDaysAgo } },
        },
      },
      select: { id: true },
    });
    for (const user of inactiveUsers) {
      await this.notifications.create({
        userId: user.id,
        type: NotificationType.RE_ENGAGEMENT,
        title: 'Wir vermissen dich!',
        body: 'Du hast in letzter Zeit nichts gehört. Schau rein – es gibt Neues für dich!',
        data: {},
      });
    }
  }

  // F-656: Winback nach Abo-Kündigung (täglich um 12:00)
  @Cron('0 12 * * *')
  async sendWinbackNotifications() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const cancelledSubs = await this.prisma.subscription.findMany({
      where: { status: 'CANCELED', updatedAt: { gte: eightDaysAgo, lte: sevenDaysAgo } },
      select: { userId: true },
    });
    for (const sub of cancelledSubs) {
      await this.notifications.create({
        userId: sub.userId,
        type: NotificationType.WINBACK_CAMPAIGN,
        title: 'Komm zurück zu CreatorLend!',
        body: 'Dein Abo wurde gekündigt. Wir würden uns freuen, dich wieder begrüßen zu dürfen.',
        data: {},
      });
    }
  }

  // F-657: Post-Leihe-Umfrage 3 Tage nach Leihe (täglich um 13:00)
  @Cron('0 13 * * *')
  async sendPostLoanSurveys() {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const recentLoans = await this.prisma.loan.findMany({
      where: { createdAt: { gte: fourDaysAgo, lte: threeDaysAgo } },
      select: { id: true, userId: true, workId: true },
    });
    for (const loan of recentLoans) {
      await this.notifications.create({
        userId: loan.userId,
        type: NotificationType.POST_LOAN_SURVEY,
        title: 'Hat dir das Werk gefallen?',
        body: 'Teile deine Meinung und bewerte deine Leihe.',
        data: { loanId: loan.id, workId: loan.workId },
      });
    }
  }

  // F-660: Welcome-Serie für neue Nutzer:innen (täglich um 08:30)
  @Cron('30 8 * * *')
  async sendWelcomeSeries() {
    const now = new Date();
    const days = [1, 3, 7, 10, 14];
    for (const day of days) {
      const start = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const newUsers = await this.prisma.user.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true },
      });
      for (const user of newUsers) {
        await this.notifications.create({
          userId: user.id,
          type: NotificationType.WELCOME_SERIES,
          title: `Willkommen bei CreatorLend – Tag ${day}`,
          body: day === 1
            ? 'Schön, dass du da bist! Entdecke jetzt Werke von unabhängigen Künstler:innen.'
            : day === 3
            ? 'Hast du schon dein erstes Werk ausgeliehen? Stöbere in unserer Bibliothek!'
            : day === 7
            ? 'Eine Woche dabei – entdecke Creator, denen du folgen kannst.'
            : day === 10
            ? 'Deine persönlichen Empfehlungen warten auf dich.'
            : 'Zwei Wochen CreatorLend – wie gefällt dir die Plattform?',
          data: { day },
        });
      }
    }
  }
}
