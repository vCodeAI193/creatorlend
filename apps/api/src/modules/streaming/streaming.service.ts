import { Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// F-958/F-959/F-960: HLS Streaming & Adaptive Bitrate
@Injectable()
export class StreamingService {
  private readonly cdnBase = process.env.MEDIA_CDN_BASE_URL ?? 'https://cdn.creatorlend.com';
  private readonly secret = process.env.MEDIA_HMAC_SECRET ?? 'dev-secret';

  constructor(private readonly prisma: PrismaService) {}

  private signUrl(path: string, expiresAt: number): string {
    const token = createHmac('sha256', this.secret)
      .update(`${path}:${expiresAt}`)
      .digest('hex');
    return `${this.cdnBase}${path}?token=${token}&expires=${expiresAt}`;
  }

  // F-958: HLS-Playlist-URL für aktive Leihe
  async getHlsPlaylist(userId: string, workId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { userId, workId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true },
    });
    if (!loan) throw new NotFoundException('no_active_loan');
    const expiresAt = Math.floor(loan.expiresAt.getTime() / 1000);
    return {
      playlistUrl: this.signUrl(`/hls/${workId}/master.m3u8`, expiresAt),
      expiresAt: loan.expiresAt.toISOString(),
      format: 'HLS',
    };
  }

  // F-959: ABR-Varianten (Qualitätsstufen)
  getAbrVariants(workId: string) {
    return {
      workId,
      variants: [
        { quality: 'LOW', bitrate: 64, url: `${this.cdnBase}/hls/${workId}/64k/playlist.m3u8` },
        { quality: 'MEDIUM', bitrate: 128, url: `${this.cdnBase}/hls/${workId}/128k/playlist.m3u8` },
        { quality: 'HIGH', bitrate: 320, url: `${this.cdnBase}/hls/${workId}/320k/playlist.m3u8` },
      ],
    };
  }

  // F-960: Audio-Segment-URLs (10s-Chunks)
  getSegmentUrls(workId: string, quality: string, segmentCount = 10) {
    const expiresAt = Math.floor((Date.now() + 3600 * 1000) / 1000);
    const segments = Array.from({ length: segmentCount }, (_, i) => ({
      index: i,
      url: this.signUrl(`/hls/${workId}/${quality}/${i.toString().padStart(4, '0')}.ts`, expiresAt),
      durationSeconds: 10,
    }));
    return { workId, quality, segments, segmentDuration: 10 };
  }

  // F-862: Audio-Focus / Playback-State für aktive Session
  async getPlaybackState(userId: string, workId: string) {
    const position = await this.prisma.playbackPosition.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    return {
      workId,
      positionSeconds: position?.positionSeconds ?? 0,
      lastUpdated: position?.updatedAt ?? null,
    };
  }
}
