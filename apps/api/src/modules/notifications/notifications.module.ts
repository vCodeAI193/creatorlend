import { Global, Module } from "@nestjs/common";
import { NotificationsController, NotificationsPublicController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsScheduler } from "./notifications.scheduler";

@Global()
@Module({
  controllers: [NotificationsPublicController, NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationsScheduler],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
