import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { BlocksService } from "../engagement/blocks.service";
import { ActivitySummaryService } from "./activity-summary.service";
import { CookieConsentService } from "./cookie-consent.service";
import { CookieConsentController } from "./cookie-consent.controller";
import { ConsentService } from "./consent.service";
import { AbTestingService } from "../admin/ab-testing.service";
import { FeatureFlagsService } from "../admin/feature-flags.service";
import { WebhooksSubscriptionService } from "./webhooks.service";
import { WebhooksSubscriptionController } from "./webhooks.controller";

@Module({
  controllers: [UsersController, CookieConsentController, WebhooksSubscriptionController],
  providers: [UsersService, BlocksService, ActivitySummaryService, CookieConsentService, ConsentService, AbTestingService, FeatureFlagsService, WebhooksSubscriptionService],
  exports: [UsersService, ActivitySummaryService, CookieConsentService, ConsentService, AbTestingService, WebhooksSubscriptionService],
})
export class UsersModule {}
