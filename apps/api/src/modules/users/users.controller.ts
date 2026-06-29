import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { UsersService } from "./users.service";
import { BlocksService } from "../engagement/blocks.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly blocks: BlocksService,
  ) {}

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

  // POST /api/v1/users/me/blocks/:userId – User blockieren (F-577)
  @Post("me/blocks/:userId")
  block(@CurrentUser() userId: string, @Param("userId") blockedId: string) {
    return this.blocks.block(userId, blockedId);
  }

  // DELETE /api/v1/users/me/blocks/:userId – User entblocken (F-578)
  @Delete("me/blocks/:userId")
  unblock(@CurrentUser() userId: string, @Param("userId") blockedId: string) {
    return this.blocks.unblock(userId, blockedId);
  }

  // GET /api/v1/users/me/blocks – Blockliste (F-577)
  @Get("me/blocks")
  listBlocks(@CurrentUser() userId: string) {
    return this.blocks.list(userId);
  }

  // GET /api/v1/users/me/referral – Referral-Statistiken (F-063)
  @Get("me/referral")
  referralStats(@CurrentUser() userId: string) {
    return this.users.getReferralStats(userId);
  }

  // GET /api/v1/users/me/completion – Profilvervollständigungs-Score (F-068)
  @Get("me/completion")
  profileCompletion(@CurrentUser() userId: string) {
    return this.users.profileCompletion(userId);
  }

  // POST /api/v1/users/me/upgrade-to-artist – Upgrade zu Künstler:in (F-027)
  @Post("me/upgrade-to-artist")
  upgradeToArtist(@CurrentUser() userId: string) {
    return this.users.upgradeToArtist(userId);
  }

  // POST /api/v1/users/me/invite-codes – Einladungscode erstellen (F-062)
  @Post("me/invite-codes")
  createInviteCode(
    @CurrentUser() userId: string,
    @Body() body: { maxUses?: number; bonusLoans?: number; expiresAt?: string },
  ) {
    return this.users.createInviteCode(userId, body);
  }

  // GET /api/v1/users/me/invite-codes – Eigene Einladungscodes abrufen (F-062)
  @Get("me/invite-codes")
  getInviteCodes(@CurrentUser() userId: string) {
    return this.users.getInviteCodes(userId);
  }

  // GET /api/v1/users/me/milestones – Milestones abrufen (F-469)
  @Get("me/milestones")
  getMilestones(@CurrentUser() userId: string) {
    return this.users.getMilestones(userId);
  }

  // GET /api/v1/users/me/badges – eigene Badges abrufen (F-065)
  @Get("me/badges")
  getMyBadges(@CurrentUser() userId: string) {
    return this.users.getBadges(userId);
  }

  // GET /api/v1/users/:id/badges – Badges eines Nutzers (F-065)
  @Get(":id/badges")
  getBadges(@Param("id") id: string) {
    return this.users.getBadges(id);
  }

  // PATCH /api/v1/users/me/notification-settings – Benachrichtigungs-Einstellungen (F-642, F-643)
  @Patch("me/notification-settings")
  setNotificationSettings(
    @CurrentUser() userId: string,
    @Body() body: { quietHoursStart?: number; quietHoursEnd?: number; notifDigestMode?: string },
  ) {
    return this.users.setNotificationSettings(userId, body);
  }

  // GET /api/v1/users/notes – persönliche Werknotizen (F-126)
  @Get("notes")
  listWorkNotes(@CurrentUser() userId: string) {
    return this.users.listWorkNotes(userId);
  }
}
