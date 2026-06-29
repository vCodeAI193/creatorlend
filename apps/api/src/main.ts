import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { initTelemetry } from "./common/telemetry";
import { initSentry } from "./common/sentry";
import { DeprecationInterceptor } from "./common/deprecation.interceptor";
import { HttpLoggerInterceptor } from "./common/http-logger.interceptor";

async function bootstrap() {
  initTelemetry();
  initSentry();
  // rawBody: true bewahrt den Roh-Body für die Stripe-Webhook-Signaturprüfung.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new HttpLoggerInterceptor(), new DeprecationInterceptor());

  // F-921/F-923: CSP and Security Headers
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "media-src 'self' https:",
        "connect-src 'self'",
      ].join("; "),
    );
    next();
  });

  // F-967: CORS with configurable allowed origins
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  // F-878/F-879: Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle("CreatorLend API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  // F-967: Graceful shutdown
  app.enableShutdownHooks();

  process.on("SIGTERM", async () => {
    // eslint-disable-next-line no-console
    console.log("SIGTERM received – shutting down gracefully");
    await app.close();
    process.exit(0);
  });

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CreatorLend API läuft auf Port ${port}`);
}

void bootstrap();
