import { Module } from "@nestjs/common";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";
import { PayoutsScheduler } from "./payouts.scheduler";
import { TipsService } from "./tips.service";
import { TaxStatementService } from "./tax-statement.service";

@Module({
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutsScheduler, TipsService, TaxStatementService],
  exports: [PayoutsService, TipsService, TaxStatementService],
})
export class PayoutsModule {}
