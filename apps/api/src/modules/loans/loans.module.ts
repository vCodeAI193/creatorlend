import { Module } from "@nestjs/common";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";
import { LoansScheduler } from "./loans.scheduler";
import { LoanGiftsService } from "./loan-gifts.service";
import { SingleLoanService } from "./single-loan.service";
import { DownloadService } from "./download.service";

@Module({
  controllers: [LoansController],
  providers: [LoansService, LoansScheduler, LoanGiftsService, SingleLoanService, DownloadService],
  exports: [LoansService, LoanGiftsService, SingleLoanService, DownloadService],
})
export class LoansModule {}
