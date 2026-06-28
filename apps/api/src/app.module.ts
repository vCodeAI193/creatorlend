import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { MediaModule } from "./modules/media/media.module";
import { StripeModule } from "./modules/stripe/stripe.module";
import { MailModule } from "./modules/mail/mail.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { WorksModule } from "./modules/works/works.module";
import { LoansModule } from "./modules/loans/loans.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { EngagementModule } from "./modules/engagement/engagement.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { AdminModule } from "./modules/admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    MediaModule,
    StripeModule,
    MailModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    WorksModule,
    LoansModule,
    SubscriptionsModule,
    PayoutsModule,
    EngagementModule,
    WebhooksModule,
    AdminModule,
  ],
})
export class AppModule {}
