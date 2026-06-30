import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { createHash } from 'node:crypto';
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { hashPassword, verifyPassword } from "./password.util";
import { generateToken, hashToken } from "./token.util";

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role?: "LISTENER" | "ARTIST" | "ADMIN";
  referralCode?: string;
  birthYear?: number; // COPPA compliance (F-041)
}

const REFRESH_TTL_DAYS = 30;
const EMAIL_VERIFY_TTL_MIN = 60 * 24;
const PASSWORD_RESET_TTL_MIN = 60;
const isProd = () => process.env.NODE_ENV === "production";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  // --- Registrierung & Login ---

  async register(input: RegisterInput) {
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    let referredById: string | undefined;
    if (input.referralCode) {
      const inviter = await this.prisma.user.findUnique({ where: { referralCode: input.referralCode } });
      if (inviter) referredById = inviter.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        displayName: input.displayName,
        role: input.role ?? "LISTENER",
        referralCode: newReferralCode,
        ...(referredById ? { referredById } : {}),
        ...(input.birthYear !== undefined ? {
          birthYear: input.birthYear,
          isMinor: new Date().getFullYear() - input.birthYear < 18,
        } : {}),
      },
    });

    const verifyToken = await this.createAuthToken(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MIN);
    await this.mail.sendVerifyEmail(user.email, verifyToken);

    const tokens = await this.issueTokens(user.id, user.role, generateToken());
    return {
      ...tokens,
      ...(isProd() ? {} : { devEmailVerifyToken: verifyToken }),
    };
  }

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Account lockout check
    if (user && user.failedLoginAttempts >= 5) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.prisma.loginHistory.create({ data: { userId: user.id, ip, userAgent, success: false } }).catch(() => {});
        throw new ForbiddenException('account_locked');
      }
    }

    const valid = user && verifyPassword(password, user.passwordHash);

    if (!valid) {
      if (user) {
        const newCount = (user.failedLoginAttempts ?? 0) + 1;
        const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newCount, ...(lockUntil ? { lockedUntil: lockUntil } : {}) },
        });
        await this.prisma.loginHistory.create({ data: { userId: user.id, ip, userAgent, success: false } }).catch(() => {});
      }
      throw new UnauthorizedException('invalid_credentials');
    }

    // Reset on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Log success
    await this.prisma.loginHistory.create({ data: { userId: user.id, ip, userAgent, success: true } }).catch(() => {});

    const family = generateToken();
    const tokens = await this.issueTokens(user.id, user.role, family);

    // Create UserSession
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(tokens.refreshToken).digest('hex'),
        ip,
        browser: userAgent?.substring(0, 255),
      },
    }).catch(() => {});

    return tokens;
  }

  // --- Refresh-Token-Rotation (B-001) ---

  /**
   * Tauscht ein Refresh-Token gegen ein neues Paar. Wird ein bereits
   * widerrufenes Token erneut benutzt (Reuse), wird die gesamte Familie
   * widerrufen (Schutz gegen gestohlene Tokens).
   */
  async refresh(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!record) throw new UnauthorizedException("invalid_refresh_token");

    if (record.revokedAt) {
      // Reuse erkannt -> gesamte Familie widerrufen.
      await this.prisma.refreshToken.updateMany({
        where: { family: record.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("refresh_token_reuse_detected");
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("refresh_token_expired");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user.id, user.role, record.family);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }

  // --- E-Mail-Verifizierung (B-002) ---

  async verifyEmail(token: string) {
    const userId = await this.consumeAuthToken(token, "EMAIL_VERIFY");
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    return { verified: true };
  }

  // --- Passwort-Reset (B-003) ---

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Kein User-Enumeration: immer dieselbe Antwort.
    if (!user) return { requested: true };

    const token = await this.createAuthToken(user.id, "PASSWORD_RESET", PASSWORD_RESET_TTL_MIN);
    await this.mail.sendPasswordReset(user.email, token);
    return { requested: true, ...(isProd() ? {} : { devResetToken: token }) };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.consumeAuthToken(token, "PASSWORD_RESET");

    // Check password history (last 5)
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const newHash = hashPassword(newPassword);
    for (const h of history) {
      if (verifyPassword(newPassword, h.passwordHash)) {
        throw new BadRequestException('password_recently_used');
      }
    }

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    // Save to history, keep only last 5
    await this.prisma.passwordHistory.create({ data: { userId, passwordHash: newHash } });
    const allHistory = await this.prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (allHistory.length > 5) {
      const toDelete = allHistory.slice(5).map((h: { id: string }) => h.id);
      await this.prisma.passwordHistory.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Alle bestehenden Sessions invalidieren.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { reset: true };
  }

  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, deviceName: true, browser: true, ip: true, lastActiveAt: true, createdAt: true },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async getLoginHistory(userId: string) {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return this.prisma.loginHistory.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // --- Magic-Link Passwordless Login (F-014) ---

  async sendMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return 200 to prevent email enumeration
    if (!user) return { sent: true };

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.magicLink.create({
      data: { userId: user.id, token, expiresAt },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await this.mail.sendEmail(
      email,
      "Dein Magic-Link für CreatorLend",
      `Melde dich an mit diesem Link: ${appUrl}/auth/magic?token=${token}\n\nDer Link läuft in 15 Minuten ab.`,
    );

    return { sent: true };
  }

  async verifyMagicLink(token: string) {
    const link = await this.prisma.magicLink.findUnique({ where: { token } });

    if (!link) {
      throw new UnauthorizedException("invalid_magic_link");
    }
    if (link.usedAt) {
      throw new UnauthorizedException("magic_link_already_used");
    }
    if (link.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("magic_link_expired");
    }

    await this.prisma.magicLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: link.userId } });
    return this.issueTokens(user.id, user.role, generateToken());
  }

  // F-001: Passkey / WebAuthn (FIDO2) – Registration Challenge
  async passkeyRegistrationChallenge(userId: string) {
    const challenge = require('node:crypto').randomBytes(32).toString('base64url');
    return {
      challenge,
      rp: { name: 'CreatorLend', id: process.env.WEBAUTHN_RP_ID ?? 'creatorlend.com' },
      user: { id: userId, name: userId, displayName: 'CreatorLend User' },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', requireResidentKey: true, userVerification: 'required' },
      timeout: 60000,
    };
  }

  // F-001: Passkey – Verify registration & store credential (stub)
  async passkeyRegistrationVerify(userId: string, credential: Record<string, unknown>) {
    return { success: true, credentialId: credential['id'] ?? 'stub', message: 'passkey_registered' };
  }

  // F-001: Passkey – Authentication challenge
  passkeyAuthenticationChallenge() {
    const challenge = require('node:crypto').randomBytes(32).toString('base64url');
    return {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: process.env.WEBAUTHN_RP_ID ?? 'creatorlend.com',
    };
  }

  // F-001: Passkey – Verify authentication & issue tokens (stub)
  async passkeyAuthenticationVerify(credential: Record<string, unknown>) {
    // In production: verify assertion against stored credential via @simplewebauthn/server
    const userId = credential['userId'] as string;
    if (!userId) throw new UnauthorizedException('invalid_passkey_credential');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('user_not_found');
    return this.issueTokens(user.id, user.role, generateToken());
  }

  // --- intern ---

  /** Public alias for use by OAuth / MagicLink controllers. */
  async issueTokensPub(userId: string, role: string, family: string) {
    return this.issueTokens(userId, role, family);
  }

  private async issueTokens(userId: string, role: string, family: string) {
    const accessToken = this.jwt.sign({ sub: userId, role });
    const refreshToken = generateToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(refreshToken), family, expiresAt },
    });
    return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: 900 };
  }

  private async createAuthToken(userId: string, type: string, ttlMinutes: number): Promise<string> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt },
    });
    return token;
  }

  private async consumeAuthToken(token: string, type: string): Promise<string> {
    const record = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.type !== type || record.usedAt) {
      throw new UnauthorizedException("invalid_token");
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("token_expired");
    }
    await this.prisma.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record.userId;
  }
}
