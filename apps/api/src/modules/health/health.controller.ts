import { Controller, Get } from "@nestjs/common";

const VERSION = process.env.npm_package_version ?? "0.1.0";

@Controller("health")
export class HealthController {
  // GET /api/v1/health – no auth required
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString(), version: VERSION };
  }
}
