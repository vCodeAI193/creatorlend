import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LoansService } from "./loans.service";

/**
 * Hintergrundjobs für den Leih-Lebenszyklus (F-052, F-060, F-082).
 * Nutzt In-Process-Cron (@nestjs/schedule); für verteilte Skalierung kann
 * später auf BullMQ/Redis umgestellt werden.
 */
@Injectable()
export class LoansScheduler {
  private readonly logger = new Logger(LoansScheduler.name);

  constructor(private readonly loans: LoansService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiry(): Promise<void> {
    const { reminded } = await this.loans.runExpiringSoonReminders();
    const { expired } = await this.loans.runExpirySweep();
    const { reset } = await this.loans.resetExpiredQuotas();
    if (reminded || expired || reset) {
      this.logger.log(
        `Sweep: ${reminded} Erinnerungen, ${expired} abgelaufen, ${reset} Kontingente zurückgesetzt`,
      );
    }
  }
}
