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

  // F-084: Automatische Audio-Transkodierung (MP3 → AAC/Opus) – stub
  getTranscodeConfig(workId: string) {
    return {
      workId,
      inputPath: `/media/${workId}/original`,
      outputs: [
        { format: 'aac', bitrate: '128k', path: `/media/${workId}/aac_128.m4a`, purpose: 'streaming_mobile' },
        { format: 'aac', bitrate: '256k', path: `/media/${workId}/aac_256.m4a`, purpose: 'streaming_hifi' },
        { format: 'opus', bitrate: '96k', path: `/media/${workId}/opus_96.ogg`, purpose: 'streaming_low' },
        { format: 'mp3', bitrate: '128k', path: `/media/${workId}/mp3_128.mp3`, purpose: 'download_compat' },
      ],
      message: 'Integrate FFmpeg or AWS MediaConvert / Cloudflare Stream for production transcoding',
      estimatedDurationSeconds: 30,
    };
  }

  // F-082/F-083: Batch-Upload Info & Upload-Progress stub
  getBatchUploadConfig() {
    return {
      maxFilesPerBatch: 10,
      maxFileSizeMb: 500,
      supportedFormats: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus'],
      uploadMethod: 'multipart_signed_url',
      progressTracking: 'poll GET /api/v1/media/upload/:uploadId/progress',
      dragDropSupported: true,
    };
  }

  // F-092: Metadaten-Import aus ID3/FLAC-Tags – stub
  extractMetadata(filename: string, fileType: string) {
    return {
      filename,
      fileType,
      extractedFields: ['title', 'artist', 'album', 'year', 'genre', 'track', 'duration', 'bitrate', 'sampleRate'],
      message: 'Install music-metadata or node-id3 npm package to parse ID3v2/FLAC tags server-side',
      example: {
        title: 'Extracted from ID3 TIT2 tag',
        artist: 'Extracted from ID3 TPE1 tag',
        album: 'Extracted from ID3 TALB tag',
        year: 'Extracted from ID3 TDRC tag',
        genre: 'Extracted from ID3 TCON tag',
        durationSeconds: 'Extracted from audio header',
      },
    };
  }
}
