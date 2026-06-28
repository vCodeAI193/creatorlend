import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { hashPassword, verifyPassword } from "./password.util";
import { generateToken, hashToken } from "./token.util";

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role?: "LISTENER" | "ARTIST";
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
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        displayName: input.displayName,
        role: input.role ?? "LISTENER",
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

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException("invalid_credentials");
    }
    return this.issueTokens(user.id, user.role, generateToken());
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    // Alle bestehenden Sessions invalidieren.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { reset: true };
  }

  // --- intern ---

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
