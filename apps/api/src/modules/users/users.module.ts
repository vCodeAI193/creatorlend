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
import { ApiKeysService } from "../auth/api-keys.service";
import { I18nController } from "./i18n.controller";
import { LocaleService } from "./locale.service";
import { TranslationManagementService } from "./translation-management.service";

@Module({
  controllers: [UsersController, CookieConsentController, WebhooksSubscriptionController, I18nController],
  providers: [UsersService, BlocksService, ActivitySummaryService, CookieConsentService, ConsentService, AbTestingService, FeatureFlagsService, WebhooksSubscriptionService, ApiKeysService, LocaleService, TranslationManagementService],
  exports: [UsersService, ActivitySummaryService, CookieConsentService, ConsentService, AbTestingService, WebhooksSubscriptionService, ApiKeysService, LocaleService, TranslationManagementService],
})
export class UsersModule {}
