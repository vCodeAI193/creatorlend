import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { DmcaService } from "./dmca.service";
import { FeatureFlagsService } from "./feature-flags.service";
import { AdminService } from "./admin.service";

/**
 * Public endpoints for DMCA filing and Feature Flag checks.
 * These do not require authentication.
 */
@Controller()
export class PublicAdminController {
  constructor(
    private readonly dmca: DmcaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly admin: AdminService,
  ) {}

  // POST /api/v1/admin/dmca – DMCA-Antrag einreichen (öffentlich, F-730)
  @Post("admin/dmca")
  @HttpCode(201)
  dmcaFile(
    @Body()
    body: {
      workId: string;
      reporterEmail: string;
      reason: string;
      reporterId?: string;
    },
  ) {
    return this.dmca.fileRequest(body.workId, body.reporterEmail, body.reason, body.reporterId);
  }

  // GET /api/v1/feature-flags/:key – Feature-Flag prüfen (öffentlich, F-743)
  @Get("feature-flags/:key")
  async checkFlag(
    @Param("key") key: string,
    @Query("userId") userId?: string,
  ) {
    const enabled = await this.featureFlags.isEnabled(key, userId);
    return { enabled };
  }

  // GET /api/v1/announcements – aktive Ankündigungen (F-390, öffentlich)
  @Get("announcements")
  listAnnouncements() {
    return this.admin.listAnnouncements(true);
  }
}
