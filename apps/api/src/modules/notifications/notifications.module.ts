import { Global, Module } from "@nestjs/common";
import { NotificationsController, NotificationsPublicController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsGateway } from "./notifications.gateway";

@Global()
@Module({
  controllers: [NotificationsPublicController, NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
