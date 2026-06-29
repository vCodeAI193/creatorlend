import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "./users.service";

@Injectable()
export class UsersScheduler {
  private readonly logger = new Logger(UsersScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /**
   * Anonymisiert Konten, die vor mehr als 30 Tagen soft-gelöscht wurden (F-024).
   * Läuft täglich um Mitternacht.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async anonymizeDeletedAccounts() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.user.findMany({
      where: {
        deletedAt: { lte: cutoff },
        email: { not: { endsWith: "@anonymized.creatorlend" } },
      },
      select: { id: true },
    });

    this.logger.log(`Anonymizing ${expired.length} expired deleted accounts`);

    for (const u of expired) {
      try {
        await this.users.anonymizeAccount(u.id);
      } catch (err) {
        this.logger.error(`Failed to anonymize account ${u.id}`, err);
      }
    }
  }
}
