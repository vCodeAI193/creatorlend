import { Module } from "@nestjs/common";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";
import { LoansScheduler } from "./loans.scheduler";
import { LoanGiftsService } from "./loan-gifts.service";
import { SingleLoanService } from "./single-loan.service";

@Module({
  controllers: [LoansController],
  providers: [LoansService, LoansScheduler, LoanGiftsService, SingleLoanService],
  exports: [LoansService, LoanGiftsService, SingleLoanService],
})
export class LoansModule {}
