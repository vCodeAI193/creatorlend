import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { WebhooksController } from "./webhooks.controller";
import { OutgoingWebhooksController } from "./outgoing-webhooks.controller";
import { OutgoingWebhooksService } from "./outgoing-webhooks.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [WebhooksController, OutgoingWebhooksController],
  providers: [OutgoingWebhooksService],
  exports: [OutgoingWebhooksService],
})
export class WebhooksModule {}
