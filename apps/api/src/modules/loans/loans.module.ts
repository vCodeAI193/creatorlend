import { Module } from "@nestjs/common";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";
import { LoansScheduler } from "./loans.scheduler";
import { LoanGiftsService } from "./loan-gifts.service";
import { SingleLoanService } from "./single-loan.service";
import { DownloadService } from "./download.service";
import { ReadingChallengeService } from "../engagement/reading-challenge.service";
import { PlaybackPositionService } from "./playback.service";
import { PlaybackController } from "./playback.controller";
import { LoansStubsService } from "./loans-stubs.service";

@Module({
  controllers: [LoansController, PlaybackController],
  providers: [LoansService, LoansScheduler, LoanGiftsService, SingleLoanService, DownloadService, ReadingChallengeService, PlaybackPositionService, LoansStubsService],
  exports: [LoansService, LoanGiftsService, SingleLoanService, DownloadService, ReadingChallengeService, PlaybackPositionService, LoansStubsService],
})
export class LoansModule {}
