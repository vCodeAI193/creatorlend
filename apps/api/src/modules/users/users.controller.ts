import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // GET /api/v1/users/me – eigenes Profil
  @Get("me")
  me(@CurrentUser() userId: string) {
    return this.users.getProfile(userId);
  }

  // PATCH /api/v1/users/me – Profil bearbeiten (B-023)
  @Patch("me")
  updateMe(
    @CurrentUser() userId: string,
    @Body() body: { displayName?: string; language?: string },
  ) {
    return this.users.updateProfile(userId, body);
  }

  // GET /api/v1/users/history – Hör-/Leih-Verlauf (B-025)
  @Get("history")
  history(@CurrentUser() userId: string, @Query("limit") limit?: string) {
    return this.users.loanHistory(userId, limit ? Number(limit) : 50);
  }

  // GET /api/v1/users/me/export – DSGVO-Datenexport (B-011)
  @Get("me/export")
  exportData(@CurrentUser() userId: string) {
    return this.users.exportData(userId);
  }

  // DELETE /api/v1/users/me – Konto löschen (B-010)
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() userId: string) {
    await this.users.deleteAccount(userId);
  }
}
