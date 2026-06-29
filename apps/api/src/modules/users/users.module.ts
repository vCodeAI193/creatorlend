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

@Module({
  controllers: [UsersController, CookieConsentController],
  providers: [UsersService, BlocksService, ActivitySummaryService, CookieConsentService, ConsentService, AbTestingService, FeatureFlagsService],
  exports: [UsersService, ActivitySummaryService, CookieConsentService, ConsentService, AbTestingService],
})
export class UsersModule {}
