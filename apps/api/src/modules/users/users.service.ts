import { Injectable, NotFoundException } from "@nestjs/common";
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
   */
  async getPublicProfile(artistId: string) {
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
   * DSGVO-Datenexport (B-011): alle personenbezogenen Daten des Nutzers
   * als strukturiertes JSON-Objekt. Passwort-Hash und Token-Hashes werden
   * NICHT exportiert.
   */
  async exportData(userId: string) {
    const [user, loans, favorites, follows, notifications] = await Promise.all([
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
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: user,
      loans,
      favorites: favorites.map((f) => ({ workId: f.workId, work: f.work, addedAt: f.createdAt })),
      follows,
      notifications,
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
}
