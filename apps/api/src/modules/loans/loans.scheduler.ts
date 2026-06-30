import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LoansService } from "./loans.service";

/**
 * Hintergrundjobs für den Leih-Lebenszyklus (F-052, F-060, F-082, F-260, F-262).
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
    const { prompted } = await this.loans.runRatingPrompts();
    if (reminded || expired || reset || prompted) {
      this.logger.log(
        `Sweep: ${reminded} Erinnerungen, ${expired} abgelaufen, ${reset} Kontingente zurückgesetzt, ${prompted} Bewertungsaufforderungen`,
      );
    }
  }

  /** F-262: 48-Stunden-Erinnerungen. */
  @Cron(CronExpression.EVERY_HOUR)
  async handle48hReminders(): Promise<void> {
    const { reminded } = await this.loans.run48hReminders();
    if (reminded) {
      this.logger.log(`48h-Erinnerungen: ${reminded} gesendet`);
    }
  }

  /** F-260: Fällige Reservierungen erfüllen. */
  @Cron(CronExpression.EVERY_HOUR)
  async handleReservations(): Promise<void> {
    const { fulfilled } = await this.loans.fulfillDueReservations();
    if (fulfilled) {
      this.logger.log(`Reservierungen erfüllt: ${fulfilled}`);
    }
  }
}
