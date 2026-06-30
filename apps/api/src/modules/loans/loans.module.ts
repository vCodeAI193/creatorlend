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
import { ListenerExperienceService } from "./listener-experience.service";

@Module({
  controllers: [LoansController, PlaybackController],
  providers: [LoansService, LoansScheduler, LoanGiftsService, SingleLoanService, DownloadService, ReadingChallengeService, PlaybackPositionService, LoansStubsService, ListenerExperienceService],
  exports: [LoansService, LoanGiftsService, SingleLoanService, DownloadService, ReadingChallengeService, PlaybackPositionService, LoansStubsService, ListenerExperienceService],
})
export class LoansModule {}
