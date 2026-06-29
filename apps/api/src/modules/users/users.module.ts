import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { BlocksService } from "../engagement/blocks.service";
import { ActivitySummaryService } from "./activity-summary.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, BlocksService, ActivitySummaryService],
  exports: [UsersService, ActivitySummaryService],
})
export class UsersModule {}
