import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: true bewahrt den Roh-Body für die Stripe-Webhook-Signaturprüfung.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // B-188: Sicherheits-Header via helmet (inline, ohne npm-Dep)
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
    next();
  });

  app.enableCors({
    origin: process.env.WEB_BASE_URL ?? "http://localhost:3000",
    credentials: true,
  });

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CreatorLend API läuft auf Port ${port}`);
}

void bootstrap();
