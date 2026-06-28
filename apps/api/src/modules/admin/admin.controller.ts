import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminService } from "./admin.service";

/** Admin-Backoffice (B-151, B-152, B-154). Nur für ADMIN-Rolle. */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/v1/admin/stats – Plattform-Übersicht
  @Get("stats")
  stats() {
    return this.admin.platformStats();
  }

  // GET /api/v1/admin/users?role=ARTIST&page=1
  @Get("users")
  listUsers(@Query("page") page = "1", @Query("role") role?: string) {
    return this.admin.listUsers(Number(page), role);
  }

  // POST /api/v1/admin/users/:id/suspend – Nutzer:in sperren (B-154)
  @Post("users/:id/suspend")
  suspend(@Param("id") id: string) {
    return this.admin.suspendUser(id);
  }

  // POST /api/v1/admin/users/:id/unsuspend – Sperre aufheben (B-154)
  @Post("users/:id/unsuspend")
  unsuspend(@Param("id") id: string) {
    return this.admin.unsuspendUser(id);
  }

  // POST /api/v1/admin/works/:id/moderate – Inhalt moderieren (B-152)
  @Post("works/:id/moderate")
  moderateWork(
    @Param("id") id: string,
    @Body("action") action: "unpublish" | "publish",
  ) {
    return this.admin.moderateWork(id, action);
  }
}
