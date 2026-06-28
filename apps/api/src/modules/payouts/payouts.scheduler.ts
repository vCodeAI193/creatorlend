import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PayoutsService } from "./payouts.service";

/**
 * Automatische monatliche Auszahlungen (B-100): einmal täglich prüfen ob
 * Künstler:innen den Mindestbetrag erreicht haben, ggf. auszahlen.
 */
@Injectable()
export class PayoutsScheduler {
  private readonly logger = new Logger(PayoutsScheduler.name);

  constructor(private readonly payouts: PayoutsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoWithdraw(): Promise<void> {
    const { processed, totalCents } = await this.payouts.autoWithdrawAll();
    if (processed > 0) {
      this.logger.log(`Auto-Auszahlung: ${processed} Künstler:innen, ${totalCents} Cent`);
    }
  }
}
