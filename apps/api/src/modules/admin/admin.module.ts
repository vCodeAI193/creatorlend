import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [PromoCodesModule, ReportsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
