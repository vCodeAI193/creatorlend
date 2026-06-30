import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { DmcaService } from "./dmca.service";
import { FeatureFlagsService } from "./feature-flags.service";
import { AnalyticsService } from "./analytics.service";
import { AbTestingService } from "./ab-testing.service";
import { ContentModerationService } from "./content-moderation.service";
import { TranslationManagementService } from "../users/translation-management.service";
import { PublicAdminController } from "./public.controller";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";
import { ReportsModule } from "../reports/reports.module";
import { AdminStubsService } from "./admin-stubs.service";

@Module({
  imports: [PromoCodesModule, ReportsModule],
  controllers: [AdminController, PublicAdminController],
  providers: [AdminService, DmcaService, FeatureFlagsService, AnalyticsService, AbTestingService, ContentModerationService, TranslationManagementService, AdminStubsService],
  exports: [AdminService, DmcaService, FeatureFlagsService, AnalyticsService, AbTestingService, ContentModerationService, TranslationManagementService, AdminStubsService],
})
export class AdminModule {}
