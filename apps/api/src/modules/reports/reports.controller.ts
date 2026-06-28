import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // POST /api/v1/reports – Inhalt melden
  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() body: { targetType: string; targetId: string; reason: string; description?: string },
  ) {
    return this.reports.create(userId, body);
  }
}
