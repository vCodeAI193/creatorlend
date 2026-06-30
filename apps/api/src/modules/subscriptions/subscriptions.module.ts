import { Module } from "@nestjs/common";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionsScheduler } from "./subscriptions.scheduler";
import { GiftCodesService } from "./gift-codes.service";
import { StudentDiscountService } from "./student-discount.service";
import { BillingStubsService } from "./billing-stubs.service";

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsScheduler, GiftCodesService, StudentDiscountService, BillingStubsService],
  exports: [SubscriptionsService, GiftCodesService, StudentDiscountService, BillingStubsService],
})
export class SubscriptionsModule {}
