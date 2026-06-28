import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Memory-hard Passwort-Hashing mit scrypt (B-004). Dependency-frei über
 * node:crypto. Format: `scrypt$<saltHex>$<hashHex>`.
 */
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), KEYLEN);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
