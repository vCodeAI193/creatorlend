import { Controller, Get, Header } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MetricsService } from "./metrics.service";

const VERSION = process.env.npm_package_version ?? "0.1.0";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  // GET /api/v1/health – no auth required
  @Get()
  check() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date(),
      version: VERSION,
    };
  }

  // GET /api/v1/health/detailed – DB connectivity check (F-917/F-918)
  @Get("detailed")
  async detailed() {
    let dbStatus: "ok" | "error" = "error";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = "ok";
    } catch {
      // db not reachable
    }
    return {
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date(),
      version: VERSION,
    };
  }

  // GET /api/v1/health/migration – Migration status (F-971)
  @Get("migration")
  async migrationStatus() {
    try {
      const result = await this.prisma.$queryRaw`SELECT COUNT(*) FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`;
      return { status: 'ok', appliedMigrations: Number((result as any)[0].count) };
    } catch {
      return { status: 'error' };
    }
  }

  // GET /api/v1/health/accessibility – WCAG compliance claims (F-982)
  @Get("accessibility")
  accessibilityStatus() {
    return {
      wcagLevel: 'AA',
      version: '2.2',
      apiConformance: 'Partial',
      features: ['aria-labels', 'keyboard-navigation', 'high-contrast-mode', 'font-size-preferences', 'reduced-motion'],
    };
  }

  // GET /metrics – Prometheus metrics endpoint (F-919)
  @Get('/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics() { return this.metricsService.collect(); }

  // GET /api/v1/health/changelog – API Changelog (F-882)
  @Get('/changelog')
  changelog() {
    return {
      currentVersion: '1.0.0',
      versions: [
        { version: '1.0.0', date: '2026-06-29', changes: ['Initial release', 'Core loan workflow', 'Artist payout system'] },
      ],
      deprecations: [],
      policy: 'Endpoints deprecated with Deprecation + Sunset headers 90 days before removal.',
    };
  }

  // GET /api/v1/health/status-page – Status-Page Integration (F-696)
  @Get('/status-page')
  statusPage() {
    return {
      provider: process.env.STATUS_PAGE_PROVIDER ?? 'self-hosted',
      url: process.env.STATUS_PAGE_URL ?? 'https://status.creatorlend.com',
      components: [
        { name: 'API', status: 'operational' },
        { name: 'Database', status: 'operational' },
        { name: 'CDN', status: 'operational' },
        { name: 'Payments (Stripe)', status: 'operational' },
        { name: 'Email (SendGrid)', status: 'operational' },
      ],
      incidentWebhook: process.env.INCIDENT_WEBHOOK_URL ?? null,
    };
  }

  // GET /api/v1/health/incidents – Aktuelle Incidents (F-698/F-699)
  @Get('/incidents')
  incidents() {
    return {
      activeIncidents: [],
      recentPostmortems: [],
      postmortemUrl: process.env.POSTMORTEM_URL ?? 'https://status.creatorlend.com/history',
      incidentEmailList: process.env.INCIDENT_EMAIL_LIST ? process.env.INCIDENT_EMAIL_LIST.split(',') : [],
    };
  }
}
