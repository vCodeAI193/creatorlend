import { Injectable } from "@nestjs/common";
import { createHmac } from "node:crypto";

/**
 * Erzeugt signierte, zeitlich begrenzte URLs für Medienzugriff.
 *
 * Die Signaturlogik (HMAC) ist real; im Dev-Modus zeigen die URLs auf
 * Platzhalter-Hosts. In Produktion zeigen sie auf CDN/Object-Storage.
 * Die Leihe steuert über `expiresAt` die Gültigkeit der Stream-URL.
 */
@Injectable()
export class MediaService {
  private readonly secret =
    process.env.MEDIA_SIGNING_SECRET ?? process.env.JWT_ACCESS_SECRET ?? "change-me";
  private readonly cdnBase = process.env.MEDIA_CDN_BASE_URL ?? "https://cdn.example.com";
  private readonly storageBase =
    process.env.STORAGE_ENDPOINT ?? "https://storage.example.com";

  private sign(path: string, expiresAtMs: number): string {
    return createHmac("sha256", this.secret)
      .update(`${path}:${expiresAtMs}`)
      .digest("hex");
  }

  /** Signierte PUT-URL für den initialen Datei-Upload eines Werks. */
  getUploadUrl(workId: string, ttlSeconds = 900): {
    url: string;
    method: "PUT";
    expiresIn: number;
  } {
    const expiresAtMs = Date.now() + ttlSeconds * 1000;
    const path = `/media/${workId}`;
    const sig = this.sign(path, expiresAtMs);
    return {
      url: `${this.storageBase}${path}?expires=${expiresAtMs}&sig=${sig}`,
      method: "PUT",
      expiresIn: ttlSeconds,
    };
  }

  /** Signierte GET-URL für die Wiedergabe, gültig bis zum Leih-Ablauf. */
  getStreamUrl(workId: string, expiresAt: Date): { streamUrl: string; expiresAt: string } {
    const expiresAtMs = expiresAt.getTime();
    const path = `/media/${workId}`;
    const sig = this.sign(path, expiresAtMs);
    return {
      streamUrl: `${this.cdnBase}${path}?expires=${expiresAtMs}&sig=${sig}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /** Verifiziert eine signierte URL (für einen späteren Streaming-Gateway). */
  verify(path: string, expiresAtMs: number, sig: string): boolean {
    if (Date.now() > expiresAtMs) return false;
    return this.sign(path, expiresAtMs) === sig;
  }
}
