import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from "@nestjs/common";
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

  // PATCH /api/v1/users/me – Profil bearbeiten (B-023, B-014, B-016, B-017)
  @Patch("me")
  updateMe(
    @CurrentUser() userId: string,
    @Body() body: {
      displayName?: string;
      language?: string;
      bio?: string;
      avatarUrl?: string;
      slug?: string;
      socialLinks?: Record<string, string>;
    },
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

  // GET /api/v1/users/me/onboarding – Künstler-Onboarding-Checkliste (B-019)
  @Get("me/onboarding")
  onboarding(@CurrentUser() userId: string) {
    return this.users.onboardingChecklist(userId);
  }

  // GET /api/v1/users/sessions – aktive Sessions auflisten (B-008)
  @Get("sessions")
  listSessions(@CurrentUser() userId: string) {
    return this.users.listSessions(userId);
  }

  // DELETE /api/v1/users/sessions/:id – Session widerrufen (B-008)
  @Delete("sessions/:id")
  revokeSession(@CurrentUser() userId: string, @Param("id") sessionId: string) {
    return this.users.revokeSession(userId, sessionId);
  }

  // GET /api/v1/users/:id/profile – öffentliches Künstler-Profil (B-013)
  @Get(":id/profile")
  publicProfile(@Param("id") artistId: string) {
    return this.users.getPublicProfile(artistId);
  }

  // GET /api/v1/users/slug/:slug – Profil per Slug (B-017)
  @Get("slug/:slug")
  profileBySlug(@Param("slug") slug: string) {
    return this.users.getProfileBySlug(slug);
  }
}
