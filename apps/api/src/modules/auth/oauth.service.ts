import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OAuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds an existing OAuth user or creates one (and a User if new).
   * Returns { user, isNew }.
   */
  async findOrCreateOAuthUser(
    provider: string,
    providerId: string,
    email?: string,
    displayName?: string,
  ) {
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });

    if (existing) {
      return { user: existing.user, isNew: false };
    }

    // Try to find user by email first
    let user = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;

    if (!user) {
      // Create a new user
      user = await this.prisma.user.create({
        data: {
          email: email ?? `${provider}_${providerId}@oauth.placeholder`,
          passwordHash: "OAUTH_NO_PASSWORD",
          displayName: displayName ?? email?.split("@")[0] ?? `User_${providerId.slice(0, 8)}`,
          role: "LISTENER",
          emailVerified: !!email,
        },
      });
    }

    await this.prisma.oAuthAccount.create({
      data: { userId: user.id, provider, providerId, email },
    });

    return { user, isNew: true };
  }

  /** Links an OAuth provider to an existing user account. */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerId: string,
    email?: string,
  ) {
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
    });

    if (existing && existing.userId !== userId) {
      throw new BadRequestException("oauth_account_linked_to_another_user");
    }

    return this.prisma.oAuthAccount.upsert({
      where: { provider_providerId: { provider, providerId } },
      create: { userId, provider, providerId, email },
      update: { email },
    });
  }

  /** Removes an OAuth link. Only allowed if the user has another login method. */
  async unlinkOAuthAccount(userId: string, provider: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Count remaining OAuth accounts after removing this one
    const remainingOAuth = await this.prisma.oAuthAccount.count({
      where: { userId, provider: { not: provider } },
    });

    const hasPassword = user.passwordHash !== "OAUTH_NO_PASSWORD";

    if (!hasPassword && remainingOAuth === 0) {
      throw new BadRequestException("cannot_unlink_last_login_method");
    }

    await this.prisma.oAuthAccount.deleteMany({
      where: { userId, provider },
    });

    return { unlinked: true, provider };
  }

  /** Lists all linked OAuth providers for a user. */
  async listOAuthAccounts(userId: string) {
    const accounts = await this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: { id: true, provider: true, email: true, createdAt: true },
    });
    return accounts;
  }
}
