import { APP_INTERCEPTOR } from "@nestjs/core";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { LanguageMiddleware } from "./common/language.middleware";
import { RequestIdMiddleware } from "./common/request-id.middleware";
import { I18nMiddleware } from "./common/i18n.middleware";
import { HttpLoggerInterceptor } from "./common/http-logger.interceptor";
import { DeprecationInterceptor } from "./common/deprecation.interceptor";
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
import { PromoCodesModule } from "./modules/promo-codes/promo-codes.module";
import { PlaylistsModule } from "./modules/playlists/playlists.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { HealthModule } from "./modules/health/health.module";
import { SupportModule } from "./modules/support/support.module";
import { GdprModule } from "./modules/gdpr/gdpr.module";
import { SurveysModule } from "./modules/surveys/surveys.module";
import { AiModule } from "./modules/ai/ai.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";
import { I18nModule } from "./modules/i18n/i18n.module";
import { MobileModule } from "./modules/mobile/mobile.module";
import { TrackingModule } from "./modules/tracking/tracking.module";
import { OAuthModule } from "./modules/oauth/oauth.module";
import { AccessibilityModule } from "./modules/accessibility/accessibility.module";
import { InfraModule } from "./modules/infra/infra.module";

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
    PromoCodesModule,
    PlaylistsModule,
    ReportsModule,
    HealthModule,
    SupportModule,
    GdprModule,
    SurveysModule,
    AiModule,
    MetricsModule,
    FeatureFlagsModule,
    I18nModule,
    MobileModule,
    TrackingModule,
    OAuthModule,
    AccessibilityModule,
    InfraModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpLoggerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: DeprecationInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, LanguageMiddleware, I18nMiddleware).forRoutes('*');
  }
}
