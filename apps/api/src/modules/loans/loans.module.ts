import { Module } from "@nestjs/common";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";
import { LoansScheduler } from "./loans.scheduler";

@Module({
  controllers: [LoansController],
  providers: [LoansService, LoansScheduler],
  exports: [LoansService],
})
export class LoansModule {}
