import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

const KEYLEN = 32;

function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function scryptHash(value: string): string {
  const salt = randomBytes(8);
  const derived = scryptSync(value, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function scryptVerify(value: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(value, Buffer.from(saltHex, "hex"), KEYLEN);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new API key for the user.
   * Returns the full key once – it will not be retrievable again.
   */
  async create(
    userId: string,
    name: string,
    scopes: string[] = [],
    expiresAt?: Date,
  ) {
    const rawRandom = randomBytes(24).toString("base64url").slice(0, 32);
    const rawKey = `cl_live_${rawRandom}`;
    const prefix = rawKey.slice(0, 12); // e.g. "cl_live_XXXX"
    const keyHash = hashApiKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, prefix, scopes, expiresAt },
      select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true, createdAt: true },
    });

    return { ...apiKey, key: rawKey };
  }

  /** Lists all non-revoked API keys for the user (without key hash). */
  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Revokes an API key (sets revokedAt). */
  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) throw new NotFoundException("api_key_not_found");
    if (key.userId !== userId) throw new ForbiddenException("not_owner");

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return { revoked: true };
  }

  /**
   * Validates a raw API key.
   * Finds by SHA-256 hash, checks not revoked/expired, updates lastUsedAt.
   * Returns the userId associated with the key.
   */
  async validateKey(rawKey: string): Promise<string | null> {
    const keyHash = hashApiKey(rawKey);

    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash } });

    if (!apiKey) return null;
    if (apiKey.revokedAt) return null;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) return null;

    // Update lastUsedAt async (fire-and-forget)
    this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return apiKey.userId;
  }
}
