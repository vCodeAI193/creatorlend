import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { MarketingService } from "./marketing.service";
import { MailWebhookController } from "./mail-webhook.controller";

@Global()
@Module({
  controllers: [MailWebhookController],
  providers: [MailService, MarketingService],
  exports: [MailService, MarketingService],
})
export class MailModule {}
