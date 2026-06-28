import { createHash, randomBytes } from "node:crypto";

/** Erzeugt ein hochentropisches Token (Klartext) für E-Mail-Links/Refresh. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Speicherbarer Hash eines Tokens (Klartext wird nie gespeichert). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
