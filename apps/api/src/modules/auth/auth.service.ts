import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role?: "LISTENER" | "ARTIST";
}

/**
 * Auth-Logik (vereinfacht). Hinweis: In der Implementierung wird Passwort-
 * Hashing mit argon2/bcrypt statt einem einfachen Hash verwendet.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private hash(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  async register(input: RegisterInput) {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: this.hash(input.password),
        displayName: input.displayName,
        role: input.role ?? "LISTENER",
      },
    });
    return this.issueTokens(user.id, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== this.hash(password)) {
      throw new UnauthorizedException("invalid_credentials");
    }
    return this.issueTokens(user.id, user.role);
  }

  private issueTokens(userId: string, role: string) {
    const accessToken = this.jwt.sign({ sub: userId, role });
    return { accessToken, tokenType: "Bearer", expiresIn: 900 };
  }
}
