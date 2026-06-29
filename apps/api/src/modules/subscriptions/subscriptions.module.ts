import { Module } from "@nestjs/common";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionsScheduler } from "./subscriptions.scheduler";
import { GiftCodesService } from "./gift-codes.service";

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsScheduler, GiftCodesService],
  exports: [SubscriptionsService, GiftCodesService],
})
export class SubscriptionsModule {}
