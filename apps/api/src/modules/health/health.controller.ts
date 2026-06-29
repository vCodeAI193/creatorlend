import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const VERSION = process.env.npm_package_version ?? "0.1.0";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
}
