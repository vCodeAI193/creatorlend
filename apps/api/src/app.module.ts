import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { MediaModule } from "./modules/media/media.module";
import { StripeModule } from "./modules/stripe/stripe.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { WorksModule } from "./modules/works/works.module";
import { LoansModule } from "./modules/loans/loans.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { EngagementModule } from "./modules/engagement/engagement.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MediaModule,
    StripeModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    WorksModule,
    LoansModule,
    SubscriptionsModule,
    PayoutsModule,
    EngagementModule,
    WebhooksModule,
  ],
})
export class AppModule {}
