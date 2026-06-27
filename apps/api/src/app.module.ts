import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { MediaModule } from "./modules/media/media.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { WorksModule } from "./modules/works/works.module";
import { LoansModule } from "./modules/loans/loans.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MediaModule,
    AuthModule,
    UsersModule,
    WorksModule,
    LoansModule,
    SubscriptionsModule,
    PayoutsModule,
  ],
})
export class AppModule {}
