import { Global, Module } from "@nestjs/common";
import { NotificationsController, NotificationsPublicController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  controllers: [NotificationsPublicController, NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
