import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { DmcaService } from "./dmca.service";
import { FeatureFlagsService } from "./feature-flags.service";
import { AnalyticsService } from "./analytics.service";
import { PublicAdminController } from "./public.controller";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [PromoCodesModule, ReportsModule],
  controllers: [AdminController, PublicAdminController],
  providers: [AdminService, DmcaService, FeatureFlagsService, AnalyticsService],
  exports: [DmcaService, FeatureFlagsService, AnalyticsService],
})
export class AdminModule {}
