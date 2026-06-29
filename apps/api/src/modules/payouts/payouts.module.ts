import { Module } from "@nestjs/common";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";
import { PayoutsScheduler } from "./payouts.scheduler";
import { TipsService } from "./tips.service";

@Module({
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutsScheduler, TipsService],
  exports: [PayoutsService, TipsService],
})
export class PayoutsModule {}
