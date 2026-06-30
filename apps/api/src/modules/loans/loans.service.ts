import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { Loan } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";
import { MailService } from "../mail/mail.service";
import { ReadingChallengeService } from "../engagement/reading-challenge.service";

/**
 * Kern-Logik des Leihmodells:
 * Ein Werk = eine Woche = eine faire Vergütung. Jede Ausleihe (und jede
 * Verlängerung) erzeugt ein PayoutItem für die/den Künstler:in.
 *
 * Ablauf wird "lazy" beim Lesen ausgewertet: aktive Leihen, deren
 * expiresAt überschritten ist, werden auf EXPIRED gesetzt (kein Worker im MVP).
 */
@Injectable()
export class LoansService {
  // F-372: Revenue share – platform keeps platformFeePct, artist gets the rest
  private readonly platformFeePct = parseInt(process.env.PLATFORM_FEE_PERCENT ?? "30", 10) / 100;
  private readonly logger = new Logger(LoansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    @Optional() private readonly readingChallenge?: ReadingChallengeService,
  ) {}

  private expiryFromNow(now: Date, days = 7): Date {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + days);
    return expires;
  }

  /** Hängt – falls die Leihe aktiv & gültig ist – die Zugriffs-URL an. */
  private withAccess(loan: Loan) {
    if (loan.status !== "ACTIVE" || loan.expiresAt.getTime() <= Date.now()) {
      return { ...loan, access: null };
    }
    return { ...loan, access: this.media.getStreamUrl(loan.workId, loan.expiresAt) };
  }

  /** Werk leihen: prüft Abo + Kontingent, legt Loan und Vergütung an. */
  async borrow(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") {
      throw new NotFoundException("work_not_found");
    }

    // F-378: Free trial loan for new users (no prior loans, paid work)
    const loanCount = await this.prisma.loan.count({ where: { userId } });
    const isFreeTrialEligible = loanCount === 0 && work.loanPriceCents > 0;

    if (!isFreeTrialEligible) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });
      if (!subscription || subscription.status !== "ACTIVE") {
        throw new HttpException("no_active_subscription", HttpStatus.PAYMENT_REQUIRED);
      }
      if (subscription.loansUsedThisPeriod >= subscription.loanQuotaPerPeriod) {
        throw new ConflictException("quota_exceeded");
      }
    }

    const now = new Date();

    // F-113: availableFrom/availableTo embargo check
    if (work.availableFrom && work.availableFrom > now) {
      throw new BadRequestException('not_yet_available');
    }
    if (work.availableTo && work.availableTo < now) {
      throw new BadRequestException('no_longer_available');
    }

    // F-115: Age rating check for R18 content
    if (work.ageRating === 'R18' || work.ageRating === 'FSK_18') {
      const userRecord = await this.prisma.user.findUnique({ where: { id: userId }, select: { ageVerified: true } });
      if (!userRecord?.ageVerified) {
        throw new ForbiddenException('age_verification_required');
      }
    }

    const existing = await this.prisma.loan.findFirst({
      where: { userId, workId, status: "ACTIVE", expiresAt: { gt: now } },
    });
    if (existing) {
      throw new ConflictException("already_borrowed");
    }

    // Transaktional: Loan + Vergütung + Kontingent-Verbrauch.
    const loan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          userId,
          workId,
          status: "ACTIVE",
          startedAt: now,
          expiresAt: this.expiryFromNow(now, work.loanDays),
        },
      });

      // F-372/F-386: Revenue share – split across contributors if configured
      const netCents = Math.round(work.loanPriceCents * (1 - this.platformFeePct));
      const splits = Array.isArray(work.revenueShares) ? work.revenueShares as { artistId: string; pct: number }[] : null;
      if (splits && splits.length > 0) {
        for (const s of splits) {
          await tx.payoutItem.create({
            data: {
              artistId: s.artistId,
              loanId: created.id,
              amountCents: Math.round(netCents * s.pct / 100),
              status: "PENDING",
            },
          });
        }
      } else {
        await tx.payoutItem.create({
          data: {
            artistId: work.artistId,
            loanId: created.id,
            amountCents: netCents,
            status: "PENDING",
          },
        });
      }

      if (!isFreeTrialEligible) {
        await tx.subscription.update({
          where: { userId },
          data: { loansUsedThisPeriod: { increment: 1 } },
        });
      }

      await tx.work.update({
        where: { id: workId },
        data: { borrowCount: { increment: 1 } },
      });

      return created;
    });

    // Künstler:in über die neue Ausleihe informieren (F-084).
    await this.notifications.create({
      userId: work.artistId,
      type: NotificationType.LOAN_CREATED,
      title: "Neue Ausleihe",
      body: `Dein Werk wurde geliehen (+${work.loanPriceCents} Cent).`,
      data: { loanId: loan.id, workId },
    });

    // Leih-Bestätigung per E-Mail (F-320)
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      this.mail.sendEmail(
        user.email,
        "Leih-Bestätigung",
        `Du hast "${work.title}" geliehen. Gültig bis: ${loan.expiresAt.toLocaleDateString("de")}.`,
      ).catch(() => { /* ignore mail errors */ });
    }

    return this.withAccess(loan);
  }

  /** Markiert abgelaufene aktive Leihen der/des Nutzer:in als EXPIRED. */
  private async expireStale(userId: string): Promise<void> {
    await this.prisma.loan.updateMany({
      where: { userId, status: "ACTIVE", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    });
  }

  async listForUser(userId: string, status?: string) {
    await this.expireStale(userId);
    const loans = await this.prisma.loan.findMany({
      where: { userId, ...(status ? { status: status as never } : {}) },
      orderBy: { startedAt: "desc" },
    });
    return loans.map((loan) => this.withAccess(loan));
  }

  async getForUser(userId: string, id: string) {
    await this.expireStale(userId);
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    return this.withAccess(loan);
  }

  /** Verlängern: +1 Woche und erneute Vergütung. */
  async renew(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (loan.status === "EXCHANGED") {
      throw new BadRequestException("loan_not_renewable");
    }
    const work = await this.prisma.work.findUniqueOrThrow({
      where: { id: loan.workId },
    });
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: "ACTIVE",
          expiresAt: this.expiryFromNow(now, work.loanDays),
          renewalCount: { increment: 1 },
        },
      });

      // F-372: Revenue share – artist gets (1 - platformFeePct) of loanPriceCents
      await tx.payoutItem.create({
        data: {
          artistId: work.artistId,
          loanId: loan.id,
          amountCents: Math.round(work.loanPriceCents * (1 - this.platformFeePct)),
          status: "PENDING",
        },
      });

      return result;
    });

    return this.withAccess(updated);
  }

  /**
   * Tauschen: aktuelle Ausleihe beenden, neues Werk leihen (B-078).
   * Standardmäßig wird kein Kontingent für den Tausch verbraucht
   * (`countsAgainstQuota=false`). Das Verhalten ist per Parameter steuerbar.
   */
  async exchange(userId: string, id: string, newWorkId: string, countsAgainstQuota = false) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (loan.status !== "ACTIVE") {
      throw new BadRequestException("loan_not_exchangeable");
    }

    await this.prisma.loan.update({
      where: { id: loan.id },
      data: { status: "EXCHANGED" },
    });

    if (!countsAgainstQuota) {
      // Kontingent temporär auf Maximum setzen, damit borrow() nicht blockiert,
      // dann nach dem Leihen die Erhöhung wieder rückgängig machen.
      // Einfacherer Weg: Kontingent-Verbrauch-Zähler nach borrow() dekrementieren.
    }

    const newLoan = await this.borrow(userId, newWorkId);

    if (!countsAgainstQuota) {
      // Tausch zählt nicht gegen das Kontingent – Verbrauch wieder zurücksetzen.
      await this.prisma.subscription.update({
        where: { userId },
        data: { loansUsedThisPeriod: { decrement: 1 } },
      });
    }

    return {
      previousLoan: { id: loan.id, status: "EXCHANGED" },
      newLoan,
      countsAgainstQuota,
    };
  }

  /**
   * Hintergrund-Sweep: setzt alle fälligen ACTIVE-Leihen auf EXPIRED und
   * benachrichtigt die Hörer:innen (F-060, F-082). Gibt die Anzahl zurück.
   * F-550: Ruft readingChallengeService.increment() für jeden Nutzer auf.
   */
  async runExpirySweep(): Promise<{ expired: number }> {
    const now = new Date();
    const due = await this.prisma.loan.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: now } },
      select: { id: true, userId: true, workId: true },
    });
    if (due.length === 0) return { expired: 0 };

    await this.prisma.loan.updateMany({
      where: { id: { in: due.map((l) => l.id) } },
      data: { status: "EXPIRED" },
    });

    await this.notifications.createMany(
      due.map((l) => ({
        userId: l.userId,
        type: NotificationType.LOAN_EXPIRED,
        title: "Leihe abgelaufen",
        body: "Deine Leihe ist abgelaufen. Du kannst sie verlängern oder neu leihen.",
        data: { loanId: l.id, workId: l.workId },
      })),
    );

    // F-550: Increment reading challenge for each user whose loan expired
    if (this.readingChallenge) {
      for (const l of due) {
        try {
          await this.readingChallenge.increment(l.userId);
        } catch (err) {
          this.logger.warn(`Reading challenge increment failed for user ${l.userId}`, err);
        }
      }
    }

    return { expired: due.length };
  }

  /**
   * F-519: Bewertungsaufforderung nach Ablauf einer Leihe.
   * Sendet RATING_PROMPT-Benachrichtigung für Leihen, die in den letzten
   * 2 Stunden abgelaufen sind, falls noch keine Bewertung vorliegt.
   */
  async runRatingPrompts(): Promise<{ prompted: number }> {
    const now = new Date();
    const since = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const recentlyExpired = await this.prisma.loan.findMany({
      where: { status: "EXPIRED", expiresAt: { gte: since, lte: now } },
      select: { id: true, userId: true, workId: true },
    });

    let prompted = 0;
    for (const l of recentlyExpired) {
      try {
        const alreadyPrompted = await this.prisma.notification.findFirst({
          where: { userId: l.userId, type: "RATING_PROMPT", data: { path: ["loanId"], equals: l.id } },
        });
        if (alreadyPrompted) continue;

        const hasReview = await this.prisma.review.findFirst({ where: { userId: l.userId, workId: l.workId } });
        if (hasReview) continue;

        await this.notifications.create({
          userId: l.userId,
          type: NotificationType.RATING_PROMPT,
          title: "Wie hat dir das Werk gefallen?",
          body: "Deine Leihe ist abgelaufen. Hinterlasse jetzt eine Bewertung!",
          data: { loanId: l.id, workId: l.workId },
        });
        prompted += 1;
      } catch (err) {
        this.logger.warn(`Rating prompt failed for loan ${l.id}`, err);
      }
    }
    return { prompted };
  }

  /**
   * Erinnerung kurz vor Ablauf (F-082): aktive Leihen, die in <24h ablaufen
   * und für die noch keine Erinnerung erzeugt wurde. Dedup über die bereits
   * vorhandene LOAN_EXPIRING-Benachrichtigung (per data.loanId).
   */
  async runExpiringSoonReminders(): Promise<{ reminded: number }> {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.loan.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: now, lte: soon } },
      select: { id: true, userId: true, workId: true, expiresAt: true },
    });

    let reminded = 0;
    for (const l of candidates) {
      const already = await this.prisma.notification.findFirst({
        where: {
          userId: l.userId,
          type: NotificationType.LOAN_EXPIRING,
          data: { path: ["loanId"], equals: l.id },
        },
      });
      if (already) continue;
      await this.notifications.create({
        userId: l.userId,
        type: NotificationType.LOAN_EXPIRING,
        title: "Leihe läuft bald ab",
        body: "Deine Leihe läuft in weniger als 24 Stunden ab.",
        data: { loanId: l.id, workId: l.workId },
      });
      reminded += 1;
    }
    return { reminded };
  }

  /**
   * Setzt das Leih-Kontingent für Abos zurück, deren Periode abgelaufen ist,
   * und verlängert die Periode um 30 Tage (F-052).
   */
  async resetExpiredQuotas(): Promise<{ reset: number }> {
    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.subscription.updateMany({
      where: { status: "ACTIVE", currentPeriodEnd: { lte: now } },
      data: { loansUsedThisPeriod: 0, currentPeriodEnd: nextPeriodEnd },
    });
    return { reset: result.count };
  }

  /** Abspielposition speichern (B-073). Nur für aktive, nicht abgelaufene Leihen. */
  async saveProgress(userId: string, id: string, positionSeconds: number) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (loan.status !== "ACTIVE" || loan.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("loan_not_active");
    }
    return this.prisma.playbackProgress.upsert({
      where: { loanId: id },
      create: { loanId: id, positionSeconds },
      update: { positionSeconds },
    });
  }

  /** Ausleihe innerhalb der 1-Stunden-Kulanzfrist stornieren (B-081). */
  async cancel(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (loan.status !== "ACTIVE") throw new BadRequestException("loan_not_active");
    const graceEnd = new Date(loan.startedAt.getTime() + 60 * 60 * 1000);
    if (new Date() > graceEnd) throw new BadRequestException("grace_period_expired");
    await this.prisma.$transaction([
      this.prisma.loan.update({ where: { id }, data: { status: "EXPIRED" } }),
      this.prisma.subscription.update({ where: { userId }, data: { loansUsedThisPeriod: { decrement: 1 } } }),
      this.prisma.payoutItem.deleteMany({ where: { loanId: id } }),
    ]);
    return { cancelled: true, loanId: id };
  }

  /** Gespeicherte Abspielposition abrufen (B-073). */
  async getProgress(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    const progress = await this.prisma.playbackProgress.findUnique({
      where: { loanId: id },
    });
    return { loanId: id, positionSeconds: progress?.positionSeconds ?? 0 };
  }

  /**
   * Hör-Statistiken des Nutzers (F-270-272).
   */
  async getListeningStats(userId: string) {
    const [totalLoans, completedLoans, totalRenewals] = await Promise.all([
      this.prisma.loan.count({ where: { userId } }),
      this.prisma.loan.count({ where: { userId, status: "EXPIRED" } }),
      this.prisma.loan.aggregate({ where: { userId }, _sum: { renewalCount: true } }),
    ]);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentLoans = await this.prisma.loan.findMany({
      where: { userId, createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true, work: { select: { type: true } } },
    });
    const byMonth: Record<string, number> = {};
    recentLoans.forEach((l) => {
      const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    });
    return { totalLoans, completedLoans, totalRenewals: totalRenewals._sum.renewalCount ?? 0, byMonth };
  }

  /** Leihen ohne Abo-Check – für Pay-per-loan (F-321). */
  async borrowWithoutSubscription(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== 'PUBLISHED') {
      throw new NotFoundException('work_not_found');
    }
    const now = new Date();
    const loan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          userId,
          workId,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt: this.expiryFromNow(now, work.loanDays),
        },
      });
      await tx.payoutItem.create({
        data: {
          artistId: work.artistId,
          loanId: created.id,
          amountCents: Math.round(work.loanPriceCents * (1 - this.platformFeePct)),
          status: 'PENDING',
        },
      });
      await tx.work.update({ where: { id: workId }, data: { borrowCount: { increment: 1 } } });
      return created;
    });
    return this.withAccess(loan);
  }

  /**
   * Jahresrückblick (F-271).
   */
  async getYearInReview(userId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const loans = await this.prisma.loan.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      include: { work: { select: { type: true, title: true, artist: { select: { displayName: true } } } } },
    });
    const byType: Record<string, number> = {};
    loans.forEach((l) => { byType[l.work.type] = (byType[l.work.type] ?? 0) + 1; });
    const favoriteType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { year, totalLoans: loans.length, byType, favoriteType };
  }

  // ─── F-251/F-252: Multi-device loan access ───────────────────────────────

  /** Gerät für eine Ausleihe registrieren oder lastSeenAt aktualisieren. */
  async registerDevice(userId: string, loanId: string, deviceId: string, userAgent?: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (loan.status !== "ACTIVE" || loan.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("loan_not_active");
    }

    // Check device limit from FeatureFlag (default 3)
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: "max_devices_per_loan" } });
    const maxDevices = flag ? (flag.rolloutPct > 0 ? 3 : 3) : 3; // default 3; could use rolloutPct as value

    const existing = await this.prisma.loanDevice.findUnique({
      where: { loanId_deviceId: { loanId, deviceId } },
    });
    if (!existing) {
      const count = await this.prisma.loanDevice.count({ where: { loanId } });
      if (count >= maxDevices) {
        throw new ConflictException("device_limit_reached");
      }
      return this.prisma.loanDevice.create({
        data: { loanId, deviceId, userAgent, lastSeenAt: new Date() },
      });
    }
    return this.prisma.loanDevice.update({
      where: { loanId_deviceId: { loanId, deviceId } },
      data: { lastSeenAt: new Date(), ...(userAgent ? { userAgent } : {}) },
    });
  }

  /** Geräte einer Ausleihe auflisten. */
  async getDevices(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    return this.prisma.loanDevice.findMany({ where: { loanId }, orderBy: { lastSeenAt: "desc" } });
  }

  // ─── F-267: Loan Pause (Vacation Mode) ───────────────────────────────────

  /** Leihe pausieren (max. 30 Tage). */
  async pause(userId: string, loanId: string, days: number) {
    if (days < 1 || days > 30) throw new BadRequestException("pause_days_must_be_1_to_30");
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (loan.status !== "ACTIVE" || loan.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("loan_not_active");
    }
    if (loan.pausedAt) throw new ConflictException("loan_already_paused");
    const now = new Date();
    const pausedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const newExpiresAt = new Date(loan.expiresAt.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.loan.update({
      where: { id: loanId },
      data: { pausedAt: now, pausedUntil, expiresAt: newExpiresAt },
    });
  }

  /** Leihe-Pause beenden. */
  async resume(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException("loan_not_found");
    if (!loan.pausedAt || !loan.pausedUntil) throw new BadRequestException("loan_not_paused");
    const now = new Date();
    // If resuming early, reduce expiresAt by remaining pause time
    const remainingPauseMs = Math.max(0, loan.pausedUntil.getTime() - now.getTime());
    const newExpiresAt = new Date(loan.expiresAt.getTime() - remainingPauseMs);
    return this.prisma.loan.update({
      where: { id: loanId },
      data: { pausedAt: null, pausedUntil: null, expiresAt: newExpiresAt },
    });
  }

  // ─── F-260: Scheduled/Reserved Loan ──────────────────────────────────────

  /** Reservierung für ein zukünftiges Datum anlegen. */
  async reserve(userId: string, workId: string, scheduledAt: Date) {
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException("scheduled_at_must_be_in_future");
    }
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");
    return this.prisma.loanReservation.create({
      data: { userId, workId, scheduledAt, status: "PENDING" },
    });
  }

  /** Reservierung stornieren. */
  async cancelReservation(userId: string, reservationId: string) {
    const reservation = await this.prisma.loanReservation.findFirst({
      where: { id: reservationId, userId },
    });
    if (!reservation) throw new NotFoundException("reservation_not_found");
    if (reservation.status !== "PENDING") throw new BadRequestException("reservation_not_pending");
    return this.prisma.loanReservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED" },
    });
  }

  /** Reservierungen des Nutzers auflisten. */
  async listReservations(userId: string) {
    return this.prisma.loanReservation.findMany({
      where: { userId, status: "PENDING" },
      include: { work: { select: { id: true, title: true, type: true } } },
      orderBy: { scheduledAt: "asc" },
    });
  }

  /** Scheduler: fällige Reservierungen erfüllen. */
  async fulfillDueReservations(): Promise<{ fulfilled: number }> {
    const now = new Date();
    const due = await this.prisma.loanReservation.findMany({
      where: { status: "PENDING", scheduledAt: { lte: now } },
    });
    let fulfilled = 0;
    for (const r of due) {
      try {
        const loan = await this.borrowWithoutSubscription(r.userId, r.workId);
        await this.prisma.loanReservation.update({
          where: { id: r.id },
          data: { status: "FULFILLED", loanId: (loan as { id: string }).id },
        });
        fulfilled += 1;
      } catch {
        // skip if work no longer available
      }
    }
    return { fulfilled };
  }

  // ─── F-239: Gift loan ────────────────────────────────────────────────────

  /**
   * Werk an eine andere Person verschenken (F-239).
   * Verschenker braucht ein aktives Abo; Empfänger erhält die Leihe.
   */
  async giftLoan(gifterId: string, workId: string, recipientEmail: string) {
    const recipient = await this.prisma.user.findUnique({ where: { email: recipientEmail } });
    if (!recipient) throw new NotFoundException('recipient_not_found');

    const subscription = await this.prisma.subscription.findUnique({ where: { userId: gifterId } });
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new HttpException('no_active_subscription', HttpStatus.PAYMENT_REQUIRED);
    }
    if (subscription.loansUsedThisPeriod >= subscription.loanQuotaPerPeriod) {
      throw new ConflictException('quota_exceeded');
    }

    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== 'PUBLISHED') throw new NotFoundException('work_not_found');

    const now = new Date();
    const loan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          userId: recipient.id,
          workId,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt: this.expiryFromNow(now, work.loanDays),
        },
      });
      await tx.payoutItem.create({
        data: {
          artistId: work.artistId,
          loanId: created.id,
          amountCents: Math.round(work.loanPriceCents * (1 - this.platformFeePct)),
          status: 'PENDING',
        },
      });
      await tx.subscription.update({
        where: { userId: gifterId },
        data: { loansUsedThisPeriod: { increment: 1 } },
      });
      await tx.work.update({ where: { id: workId }, data: { borrowCount: { increment: 1 } } });
      return created;
    });
    return loan;
  }

  // F-317: Leihe-Verlauf anonymisieren / löschen
  async clearLoanHistory(userId: string) {
    const result = await this.prisma.loan.deleteMany({
      where: { userId, status: { in: ['EXPIRED', 'EXCHANGED'] } },
    });
    return { cleared: result.count };
  }

  // F-318: Privater Hör-Modus ein-/ausschalten
  async setPrivateListeningMode(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { privateListeningMode: enabled },
      select: { id: true, privateListeningMode: true },
    });
  }

  /**
   * 48-Stunden-Erinnerung vor Ablauf (F-262).
   */
  async run48hReminders(): Promise<{ reminded: number }> {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const candidates = await this.prisma.loan.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: in48h, lte: in72h } },
      select: { id: true, userId: true, workId: true },
    });

    let reminded = 0;
    for (const l of candidates) {
      const already = await this.prisma.notification.findFirst({
        where: {
          userId: l.userId,
          type: NotificationType.LOAN_EXPIRING_48H,
          data: { path: ["loanId"], equals: l.id },
        },
      });
      if (already) continue;
      await this.notifications.create({
        userId: l.userId,
        type: NotificationType.LOAN_EXPIRING_48H,
        title: "Leihe läuft in 48 Stunden ab",
        body: "Deine Leihe läuft in weniger als 48 Stunden ab.",
        data: { loanId: l.id, workId: l.workId },
      });
      reminded += 1;
    }
    return { reminded };
  }

  /**
   * F-552/F-553: Teilbare Jahresstatistiken des Nutzers.
   * Gibt aggregierte Hördaten für das angegebene Jahr zurück,
   * damit ein Share-Poster generiert werden kann.
   */
  async getShareableStats(userId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const start = new Date(targetYear, 0, 1);
    const end = new Date(targetYear + 1, 0, 1);
    const loans = await this.prisma.loan.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      include: { work: { select: { type: true, title: true, artist: { select: { displayName: true } } } } },
    });
    const byType: Record<string, number> = {};
    const byArtist: Record<string, number> = {};
    for (const l of loans) {
      byType[l.work.type] = (byType[l.work.type] ?? 0) + 1;
      const name = l.work.artist.displayName;
      byArtist[name] = (byArtist[name] ?? 0) + 1;
    }
    const topArtist = Object.entries(byArtist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      year: targetYear,
      totalLoans: loans.length,
      byType,
      byArtist,
      topArtist,
      topType,
      shareToken: Buffer.from(`${userId}:${targetYear}`).toString('base64url'),
    };
  }
}
