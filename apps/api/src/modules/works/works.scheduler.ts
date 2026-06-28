import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Hintergrundjobs für geplante Veröffentlichungen (B-040).
 * Läuft jede Minute und publiziert Werke, deren publishAt-Zeitstempel
 * in der Vergangenheit liegt.
 */
@Injectable()
export class WorksScheduler {
  private readonly logger = new Logger(WorksScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPublish(): Promise<void> {
    const due = await this.prisma.work.findMany({
      where: { status: "DRAFT", publishAt: { lte: new Date() } },
      select: { id: true, title: true, artistId: true },
    });

    if (due.length === 0) return;

    for (const work of due) {
      await this.prisma.work.update({
        where: { id: work.id },
        data: { status: "PUBLISHED", publishAt: null },
      });

      // Follower:innen benachrichtigen
      const followers = await this.prisma.follow.findMany({
        where: { artistId: work.artistId },
        select: { followerId: true },
      });
      if (followers.length > 0) {
        await this.notifications.createMany(
          followers.map((f) => ({
            userId: f.followerId,
            type: "NEW_WORK",
            title: "Neues Werk verfügbar",
            body: `„${work.title}" ist jetzt ausleihbar.`,
            data: { workId: work.id, artistId: work.artistId },
          })),
        );
      }
    }

    this.logger.log(`Geplante Veröffentlichung: ${due.length} Werk(e) publiziert`);
  }
}
