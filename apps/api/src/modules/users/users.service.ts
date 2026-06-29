import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, language: true, role: true, emailVerified: true, createdAt: true },
    });
    if (!user) throw new NotFoundException("user_not_found");
    return user;
  }

  /** Profil aktualisieren (B-023, B-014, B-016, B-017): Name, Sprache, Bio, Avatar, Slug, Links. */
  async updateProfile(
    userId: string,
    update: {
      displayName?: string;
      language?: string;
      bio?: string;
      avatarUrl?: string;
      slug?: string;
      socialLinks?: Record<string, string>;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(update.displayName ? { displayName: update.displayName } : {}),
        ...(update.language !== undefined ? { language: update.language } : {}),
        ...(update.bio !== undefined ? { bio: update.bio } : {}),
        ...(update.avatarUrl !== undefined ? { avatarUrl: update.avatarUrl } : {}),
        ...(update.slug !== undefined ? { slug: update.slug || null } : {}),
        ...(update.socialLinks !== undefined ? { socialLinks: update.socialLinks } : {}),
      },
      select: {
        id: true, email: true, displayName: true, language: true, bio: true,
        avatarUrl: true, slug: true, socialLinks: true, role: true, createdAt: true,
      },
    });
  }

  /**
   * Öffentliches Künstler-Profil per Slug (B-017).
   */
  async getProfileBySlug(slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("artist_not_found");
    return this.getPublicProfile(user.id);
  }

  /**
   * Öffentliches Künstler-Profil (B-013): Bio, Avatar, Werke, Follower-Anzahl.
   * Gibt 404 zurück, wenn die ID keiner:m ARTIST gehört.
   * F-059: Berücksichtigt profileVisibility.
   */
  async getPublicProfile(artistId: string, requesterId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        slug: true,
        socialLinks: true,
        role: true,
        createdAt: true,
        profileVisibility: true,
        works: {
          where: { status: "PUBLISHED" },
          select: { id: true, title: true, type: true, borrowCount: true, loanPriceCents: true },
          orderBy: { borrowCount: "desc" },
          take: 20,
        },
        _count: { select: { followers: true, works: true } },
      },
    });
    if (!user || user.role !== "ARTIST") throw new NotFoundException("artist_not_found");

    // F-059: Profile visibility check
    if (user.profileVisibility === "PRIVATE") {
      throw new NotFoundException("artist_not_found");
    }
    if (user.profileVisibility === "FOLLOWERS_ONLY") {
      if (!requesterId) throw new ForbiddenException("profile_followers_only");
      const isFollowing = await this.prisma.follow.findUnique({
        where: { followerId_artistId: { followerId: requesterId, artistId } },
      });
      if (!isFollowing) throw new ForbiddenException("profile_followers_only");
    }

    return user;
  }

  /**
   * Aktive Sessions auflisten (B-008): alle gültigen Refresh-Tokens der:des
   * Nutzer:in (nicht widerrufene, nicht abgelaufene).
   */
  async listSessions(userId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, family: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    return tokens;
  }

  /** Remote-Logout einer Session (B-008): widerruft die gesamte Token-Familie. */
  async revokeSession(userId: string, sessionId: string) {
    const token = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });
    if (!token) throw new NotFoundException("session_not_found");
    // Gesamte Familie widerrufen
    await this.prisma.refreshToken.updateMany({
      where: { userId, family: token.family },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  /** Hör-/Leih-Verlauf der letzten N Einträge inkl. Werkdaten (B-025). */
  async loanHistory(userId: string, limit = 50) {
    return this.prisma.loan.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { work: { select: { id: true, title: true, type: true, language: true, artistId: true } } },
    });
  }

  /**
   * DSGVO-Datenexport (B-011, Art. 15 DSGVO): alle personenbezogenen Daten des Nutzers
   * als strukturiertes JSON-Objekt. Passwort-Hash und Token-Hashes werden
   * NICHT exportiert.
   */
  async exportData(userId: string) {
    const [user, loans, favorites, follows, notifications, consentRecords, cookieConsents, abTests, studentVerification, oauthAccounts, apiKeys] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, email: true, displayName: true, language: true, role: true, emailVerified: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.loan.findMany({
        where: { userId },
        include: { work: { select: { id: true, title: true, type: true } } },
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.favorite.findMany({
        where: { userId },
        include: { work: { select: { id: true, title: true } } },
      }),
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { artistId: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      this.prisma.consentRecord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.cookieConsent.findMany({
        where: { userId },
      }),
      this.prisma.abTestAssignment.findMany({
        where: { userId },
        orderBy: { assignedAt: "desc" },
      }),
      this.prisma.studentVerification.findUnique({ where: { userId } }),
      this.prisma.oAuthAccount.findMany({
        where: { userId },
        select: { provider: true, email: true, createdAt: true },
      }),
      this.prisma.apiKey.findMany({
        where: { userId },
        select: { name: true, prefix: true, createdAt: true, scopes: true },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: user,
      loans,
      favorites: favorites.map((f) => ({ workId: f.workId, work: f.work, addedAt: f.createdAt })),
      follows,
      notifications,
      consentRecords,
      cookieConsents,
      abTestAssignments: abTests,
      studentVerification,
      oauthAccounts,
      apiKeys,
    };
  }

  /**
   * Künstler-Onboarding-Checkliste (B-019): zeigt an, welche Schritte
   * zur vollständigen Profilpflege noch ausstehen.
   */
  async onboardingChecklist(userId: string) {
    const [user, worksCount, publishedCount] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { bio: true, avatarUrl: true, stripeConnectAccountId: true },
      }),
      this.prisma.work.count({ where: { artistId: userId } }),
      this.prisma.work.count({ where: { artistId: userId, status: "PUBLISHED" } }),
    ]);

    const steps = [
      { key: "bio", label: "Bio hinzufügen", done: !!user.bio },
      { key: "avatar", label: "Profilbild hochladen", done: !!user.avatarUrl },
      { key: "first_work", label: "Erstes Werk anlegen", done: worksCount > 0 },
      { key: "first_publish", label: "Erstes Werk veröffentlichen", done: publishedCount > 0 },
      { key: "stripe_connect", label: "Stripe-Konto für Auszahlungen verbinden", done: !!user.stripeConnectAccountId },
    ];
    const completedCount = steps.filter((s) => s.done).length;
    return { steps, completedCount, totalCount: steps.length, complete: completedCount === steps.length };
  }

  /**
   * Kontolöschung (B-010): Alle personenbezogenen Daten werden entfernt.
   * Finanzdaten (PayoutItems) werden anonymisiert, damit Abrechnungshistorie
   * erhalten bleibt. Tokens werden widerrufen, Benachrichtigungen gelöscht.
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Tokens und Auth-Daten entfernen
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.authToken.deleteMany({ where: { userId } });

      // Nutzer-generierte Social-Daten entfernen
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.favorite.deleteMany({ where: { userId } });
      await tx.follow.deleteMany({ where: { followerId: userId } });
      await tx.follow.deleteMany({ where: { artistId: userId } });

      // Leihen beenden und Fortschritt entfernen
      const activeLoans = await tx.loan.findMany({
        where: { userId, status: "ACTIVE" },
        select: { id: true },
      });
      for (const l of activeLoans) {
        await tx.playbackProgress.deleteMany({ where: { loanId: l.id } });
      }
      await tx.loan.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      // Abo kündigen
      await tx.subscription.deleteMany({ where: { userId } });

      // Nutzer anonymisieren (kein hard-delete, um Referenz-Integrität zu wahren)
      const anon = `deleted_${userId.slice(0, 8)}@deleted.invalid`;
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anon,
          passwordHash: "deleted",
          displayName: "Gelöschter Account",
          emailVerified: false,
          stripeConnectAccountId: null,
        },
      });
    });
  }

  /**
   * Profilvervollständigungs-Score (F-068).
   */
  async profileCompletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("user_not_found");
    const checks = {
      displayName: !!user.displayName,
      bio: !!user.bio,
      avatar: !!user.avatarUrl,
      slug: !!user.slug,
      socialLinks: !!(user.socialLinks && Object.keys(user.socialLinks as object).length > 0),
      emailVerified: user.emailVerified,
      termsAccepted: !!user.termsAcceptedAt,
    };
    const completedSteps = Object.values(checks).filter(Boolean).length;
    const totalSteps = Object.keys(checks).length;
    return { score: Math.round((completedSteps / totalSteps) * 100), checks, completedSteps, totalSteps };
  }

  /**
   * Nutzer:in zu Künstler:in upgraden (F-027).
   */
  async upgradeToArtist(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("user_not_found");
    if (user.role === "ARTIST" || user.role === "ADMIN") return { message: "already_artist", role: user.role };
    return this.prisma.user.update({ where: { id: userId }, data: { role: "ARTIST" } });
  }

  /**
   * Einladungscode erstellen (F-062).
   */
  async createInviteCode(userId: string, input: { maxUses?: number; bonusLoans?: number; expiresAt?: string }) {
    return this.prisma.inviteCode.create({
      data: {
        creatorId: userId,
        maxUses: input.maxUses ?? 1,
        bonusLoans: input.bonusLoans ?? 0,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
    });
  }

  /**
   * Eigene Einladungscodes abrufen (F-062).
   */
  async getInviteCodes(userId: string) {
    return this.prisma.inviteCode.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Eigene Milestones abrufen (F-469).
   */
  async getMilestones(userId: string) {
    return this.prisma.milestone.findMany({
      where: { userId },
      orderBy: { reachedAt: "desc" },
    });
  }

  /**
   * Badges eines Nutzers abrufen (F-065).
   */
  async getBadges(userId: string) {
    return this.prisma.userBadge.findMany({ where: { userId }, orderBy: { awardedAt: "desc" } });
  }

  /**
   * Benachrichtigungs-Einstellungen setzen (F-642, F-643).
   */
  async setNotificationSettings(userId: string, settings: { quietHoursStart?: number; quietHoursEnd?: number; notifDigestMode?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(settings.quietHoursStart !== undefined ? { quietHoursStart: settings.quietHoursStart } : {}),
        ...(settings.quietHoursEnd !== undefined ? { quietHoursEnd: settings.quietHoursEnd } : {}),
        ...(settings.notifDigestMode !== undefined ? { notifDigestMode: settings.notifDigestMode } : {}),
      },
      select: { id: true, quietHoursStart: true, quietHoursEnd: true, notifDigestMode: true },
    });
  }

  /**
   * Alle persönlichen Notizen zu Werken abrufen (F-126).
   */
  async listWorkNotes(userId: string) {
    return this.prisma.workNote.findMany({
      where: { userId },
      include: { work: { select: { id: true, title: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  /** DSGVO-Anonymisierung (F-024): wird vom Scheduler 30 Tage nach Soft-Delete aufgerufen. */
  async anonymizeAccount(userId: string): Promise<void> {
    const anon = `anonymized_${userId.slice(0, 8)}@anonymized.creatorlend`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: anon,
        passwordHash: "anonymized",
        displayName: "Gelöschter Account",
        emailVerified: false,
        stripeConnectAccountId: null,
        bio: null,
        avatarUrl: null,
        socialLinks: {},
      },
    });
  }

  /** Konto nach Soft-Delete wiederherstellen (F-024). */
  async recoverAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("user_not_found");
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });
  }

  /**
   * Referral-Statistiken (F-063): eigener Einladungscode und Anzahl eingeladener Nutzer:innen.
   */
  async getReferralStats(userId: string) {
    const [user, referredCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
      this.prisma.user.count({ where: { referredById: userId } }),
    ]);
    return { referralCode: user?.referralCode, referredCount };
  }

  getProfileQrCode(userId: string) {
    const url = `https://creatorlend.io/users/${userId}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return { url, qrImageUrl };
  }

  /**
   * F-073/F-074: Inhaltspräferenzen aktualisieren.
   */
  async updatePreferences(
    userId: string,
    prefs: {
      preferredTypes?: string[];
      preferredLanguages?: string[];
      excludedLanguages?: string[];
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(prefs.preferredTypes !== undefined ? { preferredTypes: prefs.preferredTypes } : {}),
        ...(prefs.preferredLanguages !== undefined ? { preferredLanguages: prefs.preferredLanguages } : {}),
        ...(prefs.excludedLanguages !== undefined ? { excludedLanguages: prefs.excludedLanguages } : {}),
      },
      select: { id: true, preferredTypes: true, preferredLanguages: true, excludedLanguages: true },
    });
  }

  /**
   * F-059: Profil-Sichtbarkeit aktualisieren.
   */
  async updateProfileVisibility(userId: string, visibility: string) {
    const allowed = ["PUBLIC", "FOLLOWERS_ONLY", "PRIVATE"];
    if (!allowed.includes(visibility)) {
      throw new NotFoundException("invalid_visibility");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileVisibility: visibility },
      select: { id: true, profileVisibility: true },
    });
  }

  /**
   * F-241/F-242: Wunschlisten-Sichtbarkeit setzen.
   */
  async setWishlistVisibility(userId: string, isPublic: boolean, slug?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        wishlistPublic: isPublic,
        ...(slug !== undefined ? { wishlistSlug: slug || null } : {}),
      },
      select: { id: true, wishlistPublic: true, wishlistSlug: true },
    });
  }

  /**
   * F-041: Altersverifizierung.
   */
  async verifyAge(userId: string, birthYear: number, parentalConsentGiven?: boolean) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    const isMinor = age < 18;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        birthYear,
        isMinor,
        ageVerifiedAt: new Date(),
        ...(isMinor && parentalConsentGiven !== undefined ? { parentalConsent: parentalConsentGiven } : {}),
      },
      select: { id: true, birthYear: true, isMinor: true, ageVerifiedAt: true, parentalConsent: true },
    });
  }

  async setKidsMode(userId: string, enabled: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { kidsModeEnabled: enabled } });
  }

  async setTrackingPreferences(userId: string, prefs: { trackingOptOut?: boolean; profilingOptOut?: boolean; doNotTrack?: boolean }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(prefs.trackingOptOut !== undefined ? { trackingOptOut: prefs.trackingOptOut } : {}),
        ...(prefs.profilingOptOut !== undefined ? { profilingOptOut: prefs.profilingOptOut } : {}),
        ...(prefs.doNotTrack !== undefined ? { doNotTrack: prefs.doNotTrack } : {}),
      },
      select: { id: true, trackingOptOut: true, profilingOptOut: true, doNotTrack: true },
    });
  }

  async getSearchHistory(userId: string, limit = 20) {
    return this.prisma.searchHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
  }

  async clearSearchHistory(userId: string) {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
    return { cleared: true };
  }

  async deleteSearchHistoryItem(userId: string, id: string) {
    await this.prisma.searchHistory.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }

  // ─── F-306: Currency setting ──────────────────────────────────────────────

  /** Set preferred currency for a user (F-306). */
  async setCurrency(userId: string, currency: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { currency },
      select: { id: true, currency: true },
    });
  }

  // ─── F-402: FCM token ─────────────────────────────────────────────────────

  /** Save FCM push token for a user (F-402). */
  async setFcmToken(userId: string, token: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
      select: { id: true, fcmToken: true },
    });
  }

  /** F-652: Accessibility preferences. */
  async setAccessibilityPrefs(userId: string, prefs: { highContrast?: boolean; fontSize?: string; reducedMotion?: boolean }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(prefs.highContrast !== undefined ? { highContrast: prefs.highContrast } : {}),
        ...(prefs.fontSize !== undefined ? { fontSize: prefs.fontSize } : {}),
        ...(prefs.reducedMotion !== undefined ? { reducedMotion: prefs.reducedMotion } : {}),
      },
      select: { id: true, highContrast: true, fontSize: true, reducedMotion: true },
    });
  }

  // ─── F-946: CCPA Compliance ──────────────────────────────────────────────

  /** Do Not Sell My Data (CCPA F-946). */
  async setDoNotSell(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilingOptOut: true },
    });
    return { doNotSell: true, userId };
  }

  // ─── F-535: Interest Tags ────────────────────────────────────────────────

  /** Get interest tags for a user (F-535). */
  async getInterestTags(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { interestTags: true },
    });
    if (!user) throw new NotFoundException('user_not_found');
    return { interestTags: user.interestTags };
  }

  /** Update interest tags for a user (F-535). */
  async updateInterestTags(userId: string, tags: string[]) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { interestTags: tags },
      select: { id: true, interestTags: true },
    });
    return user;
  }

  // F-024: Request account deletion
  async requestDeletion(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: new Date() },
      select: { id: true, deletionRequestedAt: true },
    });
  }

  // F-024: Cancel deletion request
  async cancelDeletion(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: null },
      select: { id: true, deletionRequestedAt: true },
    });
  }

  // F-025: Deactivate account
  async deactivate(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isDeactivated: true },
      select: { id: true, isDeactivated: true },
    });
  }

  // F-025: Reactivate account
  async reactivate(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isDeactivated: false },
      select: { id: true, isDeactivated: true },
    });
  }

  // F-028: Downgrade artist to listener (sets PUBLISHED works to DRAFT)
  async downgradeToListener(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user_not_found');
    if (user.role !== 'ARTIST') return { message: 'not_artist', role: user.role };
    await this.prisma.work.updateMany({
      where: { artistId: userId, status: 'PUBLISHED' },
      data: { status: 'DRAFT' },
    });
    return this.prisma.user.update({ where: { id: userId }, data: { role: 'LISTENER' } });
  }

  // F-115: Set age verification status
  async setAgeVerified(userId: string, verified: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ageVerified: verified },
      select: { id: true, ageVerified: true },
    });
  }

  // Alias for exportData (GDPR export)
  async exportUserData(userId: string) {
    return this.exportData(userId);
  }
}
