import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, role: true, emailVerified: true, createdAt: true },
    });
    if (!user) throw new NotFoundException("user_not_found");
    return user;
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
