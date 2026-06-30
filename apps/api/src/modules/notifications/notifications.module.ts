import { Global, Module } from "@nestjs/common";
import { NotificationsController, NotificationsPublicController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsScheduler } from "./notifications.scheduler";
import { NotificationsStubsService } from "./notifications-stubs.service";

@Global()
@Module({
  controllers: [NotificationsPublicController, NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationsScheduler, NotificationsStubsService],
  exports: [NotificationsService, NotificationsGateway, NotificationsStubsService],
})
export class NotificationsModule {}
