import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { BlocksService } from "../engagement/blocks.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, BlocksService],
  exports: [UsersService],
})
export class UsersModule {}
