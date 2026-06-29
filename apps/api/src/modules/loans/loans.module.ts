import { Module } from "@nestjs/common";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";
import { LoansScheduler } from "./loans.scheduler";
import { SingleLoanService } from "./single-loan.service";

@Module({
  controllers: [LoansController],
  providers: [LoansService, LoansScheduler, SingleLoanService],
  exports: [LoansService, SingleLoanService],
})
export class LoansModule {}
