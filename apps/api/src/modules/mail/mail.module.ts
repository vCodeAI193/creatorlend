import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { MarketingService } from "./marketing.service";

@Global()
@Module({
  providers: [MailService, MarketingService],
  exports: [MailService, MarketingService],
})
export class MailModule {}
