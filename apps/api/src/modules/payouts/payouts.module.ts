import { Module } from "@nestjs/common";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";
import { PayoutsScheduler } from "./payouts.scheduler";
import { TipsService } from "./tips.service";
import { TaxStatementService } from "./tax-statement.service";
import { InvoiceService } from "./invoice.service";

@Module({
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutsScheduler, TipsService, TaxStatementService, InvoiceService],
  exports: [PayoutsService, TipsService, TaxStatementService, InvoiceService],
})
export class PayoutsModule {}
