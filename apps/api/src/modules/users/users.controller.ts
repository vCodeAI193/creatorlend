import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { UsersService } from "./users.service";
import { BlocksService } from "../engagement/blocks.service";
import { ConsentService } from "./consent.service";
import { CookieConsentService } from "./cookie-consent.service";
import { AbTestingService } from "../admin/ab-testing.service";
import { ApiKeysService } from "../auth/api-keys.service";
import { MarketingService } from "../mail/marketing.service";
import { BillingAddressService } from "./billing-address.service";
import { ReadingChallengeService } from "../engagement/reading-challenge.service";

// Plan quota limits (stub)
const PLAN_LIMITS: Record<string, { requestsPerMinute: number }> = {
  FREE: { requestsPerMinute: 10 },
  STANDARD: { requestsPerMinute: 60 },
  PREMIUM: { requestsPerMinute: 300 },
};

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly blocks: BlocksService,
    private readonly consent: ConsentService,
    private readonly cookieConsent: CookieConsentService,
    private readonly abTests: AbTestingService,
    private readonly apiKeys: ApiKeysService,
    private readonly marketing: MarketingService,
    private readonly billingAddress: BillingAddressService,
    private readonly readingChallenge: ReadingChallengeService,
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
  publicProfile(@CurrentUser() requesterId: string, @Param("id") artistId: string) {
    return this.users.getPublicProfile(artistId, requesterId);
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

  // GET /api/v1/users/me/qr – QR-Code für eigenes Profil (F-140)
  @Get("me/qr")
  getQrCode(@CurrentUser() userId: string) {
    return this.users.getProfileQrCode(userId);
  }

  // PATCH /api/v1/users/me/preferences – Inhaltspräferenzen (F-073/F-074)
  @Patch("me/preferences")
  updatePreferences(
    @CurrentUser() userId: string,
    @Body() body: {
      preferredTypes?: string[];
      preferredLanguages?: string[];
      excludedLanguages?: string[];
    },
  ) {
    return this.users.updatePreferences(userId, body);
  }

  // PATCH /api/v1/users/me/visibility – Profil-Sichtbarkeit (F-059)
  @Patch("me/visibility")
  updateVisibility(@CurrentUser() userId: string, @Body("visibility") visibility: string) {
    return this.users.updateProfileVisibility(userId, visibility);
  }

  // PATCH /api/v1/users/me/wishlist-settings – Wunschlisten-Einstellungen (F-241/F-242)
  @Patch("me/wishlist-settings")
  setWishlistVisibility(
    @CurrentUser() userId: string,
    @Body("isPublic") isPublic: boolean,
    @Body("slug") slug?: string,
  ) {
    return this.users.setWishlistVisibility(userId, isPublic, slug);
  }

  // POST /api/v1/users/me/verify-age
  @Post("me/verify-age")
  verifyAge(@CurrentUser() userId: string, @Body() body: { birthYear: number; parentalConsent?: boolean }) {
    return this.users.verifyAge(userId, body.birthYear, body.parentalConsent);
  }

  // PATCH /api/v1/users/me/kids-mode
  @Patch("me/kids-mode")
  setKidsMode(@CurrentUser() userId: string, @Body("enabled") enabled: boolean) {
    return this.users.setKidsMode(userId, enabled);
  }

  // PATCH /api/v1/users/me/tracking
  @Patch("me/tracking")
  setTracking(@CurrentUser() userId: string, @Body() body: { trackingOptOut?: boolean; profilingOptOut?: boolean; doNotTrack?: boolean }) {
    return this.users.setTrackingPreferences(userId, body);
  }

  // GET /api/v1/users/me/search-history
  @Get("me/search-history")
  getSearchHistory(@CurrentUser() userId: string, @Query("limit") limit?: string) {
    return this.users.getSearchHistory(userId, limit ? Number(limit) : 20);
  }

  // DELETE /api/v1/users/me/search-history
  @Delete("me/search-history")
  clearSearchHistory(@CurrentUser() userId: string) {
    return this.users.clearSearchHistory(userId);
  }

  // DELETE /api/v1/users/me/search-history/:id
  @Delete("me/search-history/:id")
  deleteSearchHistoryItem(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.users.deleteSearchHistoryItem(userId, id);
  }

  // POST /api/v1/users/me/consent
  @Post("me/consent")
  recordConsent(
    @CurrentUser() userId: string,
    @Body() body: { type: string; version: string; granted: boolean },
    @Request() req: any,
  ) {
    return this.consent.recordConsent(userId, body.type, body.version, body.granted, req.ip as string | undefined);
  }

  // GET /api/v1/users/me/consent
  @Get("me/consent")
  getConsent(@CurrentUser() userId: string) {
    return this.consent.getConsentHistory(userId);
  }

  // DELETE /api/v1/users/me/consent/:type
  @Delete("me/consent/:type")
  withdrawConsent(@CurrentUser() userId: string, @Param("type") type: string) {
    return this.consent.withdrawConsent(userId, type);
  }

  // GET /api/v1/users/me/ab-tests
  @Get("me/ab-tests")
  getAbTests(@CurrentUser() userId: string) {
    return this.abTests.listAssignments(userId);
  }

  // PATCH /api/v1/users/me/currency – Währung setzen (F-306)
  @Patch("me/currency")
  setCurrency(@CurrentUser() userId: string, @Body("currency") currency: string) {
    return this.users.setCurrency(userId, currency);
  }

  // PATCH /api/v1/users/me/fcm-token – FCM-Token speichern (F-402)
  @Patch("me/fcm-token")
  setFcmToken(@CurrentUser() userId: string, @Body("token") token: string) {
    return this.users.setFcmToken(userId, token);
  }

  // PATCH /api/v1/users/me/accessibility – Barrierefreiheits-Einstellungen (F-652)
  @Patch("me/accessibility")
  setAccessibility(@CurrentUser() userId: string, @Body() body: { highContrast?: boolean; fontSize?: string; reducedMotion?: boolean }) {
    return this.users.setAccessibilityPrefs(userId, body);
  }

  // GET /api/v1/users/me/api-quota – API-Key-Nutzung (F-876)
  @Get("me/api-quota")
  async getApiQuota(@CurrentUser() userId: string) {
    const keys = await this.apiKeys.list(userId);
    const activeKeys = keys.filter((k) => !k.expiresAt || k.expiresAt > new Date());
    return {
      keyCount: activeKeys.length,
      keys: activeKeys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        lastUsedAt: k.lastUsedAt,
      })),
    };
  }

  // GET /api/v1/users/me/quota – Rate-Limit-Info (F-875/F-876)
  @Get("me/quota")
  async getQuota(@CurrentUser() userId: string) {
    const profile = await this.users.getProfile(userId);
    const sub = (profile as Record<string, unknown>)?.subscription as { plan?: string } | undefined;
    const plan = sub?.plan ?? 'FREE';
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['FREE'];
    return {
      plan,
      requestsPerMinute: limits.requestsPerMinute,
      used: 0, // Stub: would be populated from a rate-limit store
    };
  }

  // POST /api/v1/users/me/marketing/sync – Mailchimp sync stub (F-911)
  @Post("me/marketing/sync")
  marketingSync(@CurrentUser() userId: string) {
    return this.marketing.syncToMailchimp(userId);
  }

  // DELETE /api/v1/users/me/marketing/subscribe – Unsubscribe from marketing (F-911)
  @Delete("me/marketing/subscribe")
  marketingUnsubscribe(@CurrentUser() userId: string) {
    return this.marketing.unsubscribeFromMarketing(userId);
  }

  // POST /api/v1/users/me/marketing/track-event – Track marketing event stub (F-911)
  @Post("me/marketing/track-event")
  marketingTrackEvent(
    @CurrentUser() userId: string,
    @Body("event") event: string,
    @Body("properties") properties?: Record<string, unknown>,
  ) {
    return this.marketing.trackEvent(userId, event, properties);
  }

  // POST /api/v1/users/me/ccpa/do-not-sell – Do Not Sell My Data (F-946)
  @Post("me/ccpa/do-not-sell")
  ccpaDoNotSell(@CurrentUser() userId: string) {
    return this.users.setDoNotSell(userId);
  }

  // GET /api/v1/users/me/ccpa/data-request – CCPA Data Request (F-946)
  @Get("me/ccpa/data-request")
  ccpaDataRequest(@CurrentUser() userId: string) {
    return this.users.exportData(userId); // reuse existing GDPR export
  }

  // GET /api/v1/users/billing-address – Rechnungsadresse abrufen (F-341)
  @Get("billing-address")
  getBillingAddress(@CurrentUser() userId: string) {
    return this.billingAddress.get(userId);
  }

  // PUT /api/v1/users/billing-address – Rechnungsadresse speichern (F-341)
  @Put("billing-address")
  upsertBillingAddress(
    @CurrentUser() userId: string,
    @Body() body: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      vatNumber?: string;
    },
  ) {
    return this.billingAddress.upsert(userId, body);
  }

  // PATCH /api/v1/users/interest-tags – Interessens-Tags setzen (F-535)
  @Patch("interest-tags")
  updateInterestTags(
    @CurrentUser() userId: string,
    @Body("tags") tags: string[],
  ) {
    return this.users.updateInterestTags(userId, tags);
  }

  // GET /api/v1/users/interest-tags – Interessens-Tags abrufen (F-535)
  @Get("interest-tags")
  getInterestTags(@CurrentUser() userId: string) {
    return this.users.getInterestTags(userId);
  }

  // POST /api/v1/users/reading-challenge – Leseherausforderung setzen (F-550)
  @Post("reading-challenge")
  setReadingChallenge(
    @CurrentUser() userId: string,
    @Body("goalCount") goalCount: number,
    @Body("year") year?: number,
  ) {
    return this.readingChallenge.setGoal(userId, goalCount, year ?? new Date().getFullYear());
  }

  // GET /api/v1/users/reading-challenge – Leseherausforderung abrufen (F-550)
  @Get("reading-challenge")
  getReadingChallenge(@CurrentUser() userId: string) {
    return this.readingChallenge.getChallenge(userId);
  }
}
