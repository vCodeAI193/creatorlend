import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

// ─── TOTP (RFC 6238) implementation using node:crypto ────────────────────────

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = encoded.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  while (output.length % 8 !== 0) {
    output += "=";
  }
  return output;
}

function hotp(secret: Buffer, counter: bigint): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (code % 1_000_000).toString().padStart(6, "0");
}

function totpCheck(secret: string, token: string, windowSteps = 1): boolean {
  const key = base32Decode(secret);
  const step = 30;
  const now = BigInt(Math.floor(Date.now() / 1000 / step));
  for (let i = -windowSteps; i <= windowSteps; i++) {
    if (hotp(key, now + BigInt(i)) === token) return true;
  }
  return false;
}

function totpGenerate(secret: string): string {
  const key = base32Decode(secret);
  const step = 30;
  const counter = BigInt(Math.floor(Date.now() / 1000 / step));
  return hotp(key, counter);
}

// ─── Backup code hashing using scrypt ────────────────────────────────────────

const KEYLEN = 32;

function hashBackupCode(code: string): string {
  const salt = randomBytes(8);
  const derived = scryptSync(code, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifyBackupCode(code: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(code, Buffer.from(saltHex, "hex"), KEYLEN);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TotpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generates a new TOTP secret and returns the secret + otpauth URI. */
  async generateSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("user_not_found");

    const secretBytes = randomBytes(20);
    const secret = base32Encode(secretBytes).replace(/=/g, "");

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false },
    });

    const label = encodeURIComponent(`CreatorLend:${user.email}`);
    const issuer = encodeURIComponent("CreatorLend");
    const qrUri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;

    return { secret, qrUri };
  }

  /** Verifies the token and enables 2FA; returns plain backup codes (once). */
  async enableTotp(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException("totp_not_initialized");

    if (!totpCheck(user.totpSecret, token)) {
      throw new BadRequestException("invalid_totp_token");
    }

    // Generate 10 backup codes
    const plainCodes = Array.from({ length: 10 }, () =>
      randomBytes(4).toString("hex"),
    );
    const hashedCodes = plainCodes.map(hashBackupCode);

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, backupCodes: hashedCodes },
    });

    return { enabled: true, backupCodes: plainCodes };
  }

  /** Disables 2FA after verifying token or backup code. */
  async disableTotp(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabled || !user.totpSecret) {
      throw new BadRequestException("totp_not_enabled");
    }

    const validTotp = totpCheck(user.totpSecret, token);
    const validBackup = !validTotp && this.matchBackupCode(user.backupCodes, token) >= 0;

    if (!validTotp && !validBackup) {
      throw new BadRequestException("invalid_totp_token");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null, backupCodes: [] },
    });

    return { disabled: true };
  }

  /** Verifies a TOTP token or backup code. Backup codes are consumed on use. */
  async verifyToken(userId: string, token: string): Promise<{ valid: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabled || !user.totpSecret) {
      throw new BadRequestException("totp_not_enabled");
    }

    // Try TOTP first
    if (totpCheck(user.totpSecret, token)) {
      return { valid: true };
    }

    // Try backup codes
    const idx = this.matchBackupCode(user.backupCodes, token);
    if (idx >= 0) {
      const remaining = [...user.backupCodes];
      remaining.splice(idx, 1);
      await this.prisma.user.update({
        where: { id: userId },
        data: { backupCodes: remaining },
      });
      return { valid: true };
    }

    throw new BadRequestException("invalid_totp_token");
  }

  private matchBackupCode(hashed: string[], plain: string): number {
    for (let i = 0; i < hashed.length; i++) {
      if (verifyBackupCode(plain, hashed[i])) return i;
    }
    return -1;
  }

  /** Generate a TOTP token for testing purposes (exposed via generateSecret). */
  generateToken(secret: string): string {
    return totpGenerate(secret);
  }
}
