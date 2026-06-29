import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

/**
 * F-072: Monatliche Kontoaktivitäts-Zusammenfassung per E-Mail.
 */
@Injectable()
export class ActivitySummaryService {
  private readonly logger = new Logger(ActivitySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Zusammenfassung für einen Nutzer generieren. */
  async generateMonthlySummary(userId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    const [loans, newFollows] = await Promise.all([
      this.prisma.loan.findMany({
        where: { userId, createdAt: { gte: start, lt: end } },
        include: { work: { select: { type: true, durationSeconds: true } } },
      }),
      this.prisma.follow.findMany({
        where: { followerId: userId, createdAt: { gte: start, lt: end } },
        include: { artist: { select: { id: true, displayName: true } } },
      }),
    ]);

    const totalDays = loans.length * 7;
    const byType: Record<string, number> = {};
    loans.forEach((l) => { byType[l.work.type] = (byType[l.work.type] ?? 0) + 1; });

    return {
      userId,
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      loansCount: loans.length,
      estimatedListeningDays: totalDays,
      byType,
      newArtistsFollowed: newFollows.map((f) => ({ id: f.artist.id, displayName: f.artist.displayName })),
    };
  }

  /** Scheduler: Erste eines jeden Monats um 8 Uhr – Zusammenfassung per E-Mail. */
  @Cron("0 8 1 * *") // At 08:00 on day-of-month 1
  async sendMonthlySummaryEmails(): Promise<void> {
    this.logger.log("Sending monthly activity summaries...");
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, emailVerified: true },
      select: { id: true, email: true, displayName: true },
      take: 1000, // Process in batches in production
    });

    let sent = 0;
    for (const user of users) {
      try {
        const summary = await this.generateMonthlySummary(user.id);
        if (summary.loansCount === 0) continue; // Skip inactive users

        await this.mail.sendEmail(
          user.email,
          `Dein CreatorLend-Monatsrückblick – ${summary.month}`,
          `Hallo ${user.displayName},\n\n` +
          `Im vergangenen Monat hast du ${summary.loansCount} Werk(e) geliehen.\n` +
          `Geschätzte Hördauer: ${summary.estimatedListeningDays} Tage.\n` +
          (summary.newArtistsFollowed.length > 0
            ? `Neue Künstler:innen, denen du gefolgt bist: ${summary.newArtistsFollowed.map((a) => a.displayName).join(", ")}.\n`
            : "") +
          `\nViel Spaß beim Hören!\nDein CreatorLend-Team`,
        );
        sent += 1;
      } catch (err) {
        this.logger.error(`Failed to send summary to ${user.id}`, err);
      }
    }
    this.logger.log(`Monthly summaries sent: ${sent}/${users.length}`);
  }
}
