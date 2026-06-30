import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MobileService {
  constructor(private readonly prisma: PrismaService) {}

  // F-823: PWA Web-App-Manifest
  getManifest() {
    return {
      name: 'CreatorLend',
      short_name: 'CreatorLend',
      description: 'Leihe Musik, Podcasts und Hörbücher von Künstler:innen',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#6366f1',
      orientation: 'portrait-primary',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
      screenshots: [
        { src: '/screenshots/discover.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
      ],
      categories: ['music', 'entertainment', 'education'],
      lang: 'de',
      dir: 'ltr',
      shortcuts: [
        { name: 'Entdecken', url: '/discover', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'Meine Leihen', url: '/loans', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      ],
    };
  }

  // F-858: Deep-Link-Validierung
  getDeepLinkInfo(path: string) {
    const workMatch = path.match(/^\/work\/([^/]+)/);
    const artistMatch = path.match(/^\/artist\/([^/]+)/);
    if (workMatch) return { type: 'work', id: workMatch[1], webUrl: `https://app.creatorlend.com/work/${workMatch[1]}` };
    if (artistMatch) return { type: 'artist', id: artistMatch[1], webUrl: `https://app.creatorlend.com/artist/${artistMatch[1]}` };
    return { type: 'generic', webUrl: `https://app.creatorlend.com${path}` };
  }

  // F-827: Offline-Aktion in Queue einreihen
  async enqueueOfflineAction(userId: string, type: string, payload: Prisma.InputJsonValue) {
    return this.prisma.offlineAction.create({
      data: { userId, action: { type, payload } as Prisma.InputJsonValue },
    });
  }

  // F-828: Offline-Queue verarbeiten (sync bei Reconnect)
  async processOfflineQueue(userId: string) {
    const pending = await this.prisma.offlineAction.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    let processed = 0;
    for (const action of pending) {
      // In production: dispatch to appropriate service based on action.type
      await this.prisma.offlineAction.update({
        where: { id: action.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      processed++;
    }
    return { processed, remaining: 0 };
  }

  // F-851: Delta-Sync-Token (vereinfacht: gibt Timestamp zurück)
  async getDeltaSince(userId: string, since: string) {
    const sinceDate = new Date(since);
    const [loans, notifications] = await Promise.all([
      this.prisma.loan.findMany({
        where: { userId, updatedAt: { gte: sinceDate } },
        select: { id: true, status: true, expiresAt: true, updatedAt: true },
      }),
      this.prisma.notification.findMany({
        where: { userId, createdAt: { gte: sinceDate } },
        select: { id: true, type: true, readAt: true, createdAt: true },
      }),
    ]);
    return { syncedAt: new Date().toISOString(), loans, notifications };
  }

  // F-852/F-853: Download-Status für ein Werk (stub – CDN handles actual download)
  getDownloadInfo(workId: string, userId: string) {
    return {
      workId,
      userId,
      downloadUrl: `${process.env.MEDIA_CDN_BASE_URL ?? 'https://cdn.creatorlend.com'}/downloads/${workId}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      estimatedMb: 45,
      quality: 'HIGH',
    };
  }

  // F-855: Ablauf-Check – gibt abgelaufene Downloads zurück
  async checkExpiredDownloads(userId: string) {
    const expired = await this.prisma.loan.findMany({
      where: { userId, status: 'EXPIRED' },
      select: { id: true, workId: true, expiresAt: true },
    });
    return { expiredDownloads: expired };
  }

  // F-826: Offline-Modus-Status
  getOfflineSupportInfo() {
    return {
      supported: true,
      maxOfflineWorks: 10,
      syncIntervalSeconds: 300,
      features: ['browse_downloads', 'playback', 'bookmarks', 'notes'],
    };
  }

  // F-859: Universal Links (iOS) / App Links (Android) – AASA + assetlinks
  getUniversalLinksConfig() {
    const appId = process.env.IOS_APP_ID ?? 'de.creatorlend.app';
    const packageName = process.env.ANDROID_PACKAGE ?? 'de.creatorlend.app';
    const sha256Cert = process.env.ANDROID_SHA256_CERT ?? 'REPLACE_WITH_ACTUAL_CERT';
    return {
      ios: {
        // Content for /.well-known/apple-app-site-association
        applinks: {
          details: [
            {
              appID: appId,
              paths: ['/works/*', '/artists/*', '/loans/*', '/playlists/*'],
            },
          ],
        },
      },
      android: {
        // Content for /.well-known/assetlinks.json
        assetlinks: [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: packageName,
              sha256_cert_fingerprints: [sha256Cert],
            },
          },
        ],
      },
      deepLinkScheme: 'creatorlend://',
      supportedPaths: ['/works/:id', '/artists/:id', '/loans', '/playlists/:id'],
    };
  }
}
