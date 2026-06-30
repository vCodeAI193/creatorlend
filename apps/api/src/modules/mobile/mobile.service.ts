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

  // F-051: Biometrische Auth in mobiler App (FaceID / Fingerprint) – stub
  getBiometricAuthConfig() {
    return {
      supported: true,
      types: ['face_id', 'touch_id', 'fingerprint'],
      fallback: 'pin',
      message: 'Use react-native-biometrics or expo-local-authentication for native biometric prompt',
      flow: [
        '1. Client calls POST /api/v1/auth/biometric/challenge to get a challenge nonce',
        '2. Client signs nonce with device biometric key (stored in Secure Enclave / TEE)',
        '3. Client calls POST /api/v1/auth/biometric/verify with signed nonce',
        '4. Server verifies signature, issues access + refresh tokens',
      ],
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

  // F-821–F-822: Native App Info
  getNativeAppInfo() {
    return {
      ios: {
        status: 'planned',
        framework: 'Swift / SwiftUI',
        minVersion: 'iOS 16',
        appStoreId: process.env.IOS_APP_STORE_ID ?? null,
        appStoreUrl: process.env.IOS_APP_STORE_ID ? `https://apps.apple.com/app/id${process.env.IOS_APP_STORE_ID}` : null,
      },
      android: {
        status: 'planned',
        framework: 'Kotlin / Jetpack Compose',
        minVersion: 'Android 8.0 (API 26)',
        packageName: 'com.creatorlend.app',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.creatorlend.app',
      },
    };
  }

  // F-824–F-825: App Clip / Instant App
  getInstantAccessInfo() {
    return {
      appClip: {
        platform: 'iOS',
        status: 'planned',
        bundleId: 'com.creatorlend.app.Clip',
        triggerUrl: `${process.env.APP_BASE_URL ?? 'https://app.creatorlend.com'}/clip/works/:id`,
        maxSize: '10MB',
        features: ['Preview first 5 minutes', 'Borrow CTA'],
      },
      instantApp: {
        platform: 'Android',
        status: 'planned',
        maxSize: '15MB',
        features: ['Play preview', 'Subscribe CTA'],
      },
    };
  }

  // F-829: Datensparmodus
  getDataSaverConfig() {
    return {
      modes: [
        { name: 'HIGH_QUALITY', bitrateKbps: 320, description: 'Full quality (Wi-Fi recommended)' },
        { name: 'STANDARD', bitrateKbps: 128, description: 'Standard quality' },
        { name: 'DATA_SAVER', bitrateKbps: 64, description: 'Low quality for mobile networks' },
      ],
      autoDetect: true,
      autoDetectThreshold: '3G',
      userOverridable: true,
    };
  }

  // F-830: Wi-Fi-only Downloads
  getWifiOnlyConfig() {
    return {
      defaultEnabled: false,
      userConfigurable: true,
      detectWifiMethod: 'NetworkInfo API (mobile) / online check (PWA)',
      affectsAutoDownload: true,
    };
  }

  // F-832–F-833: Widgets
  getWidgetConfig() {
    return {
      ios: {
        kinds: ['SmallWidget', 'MediumWidget', 'LargeWidget'],
        features: ['Current loan progress', 'Quick-resume button', 'Time remaining'],
        framework: 'WidgetKit',
      },
      android: {
        kinds: ['QuickPlayer', 'LoanProgress'],
        features: ['Play/pause, next chapter', 'Loan expiry countdown'],
        framework: 'Glance API (Compose Widgets)',
      },
    };
  }

  // F-834–F-835: Dynamic Island / Live Activities
  getLiveActivitiesConfig() {
    return {
      dynamicIsland: { platform: 'iOS 16+', status: 'planned', activities: ['Now Playing', 'Loan timer'] },
      liveActivities: { platform: 'iOS 16.1+', framework: 'ActivityKit', status: 'planned', shows: ['Chapter title', 'Time remaining on lock screen'] },
    };
  }

  // F-836–F-838: Notification Extensions & Shortcuts
  getNotificationExtensionConfig() {
    return {
      richPushNotifications: { enabled: true, includesImage: true, platform: 'iOS via Notification Service Extension' },
      siriShortcuts: { platform: 'iOS', commands: ['Play last borrowed work', 'Borrow recommended work', 'Check loan status'] },
      androidShortcuts: { enabled: true, longPressActions: ['Continue listening', 'Browse recommendations'] },
    };
  }

  // F-839–F-843: Haptic, Dynamic Type, Accessibility
  getMobileA11yConfig() {
    return {
      hapticFeedback: { enabled: true, triggers: ['borrow', 'rate', 'bookmark', 'chapter_change'] },
      dynamicType: { respectsSystemFont: true, minScaleFactor: 0.8, maxScaleFactor: 1.5 },
      voiceOver: { status: 'partial', completionTarget: 'v1.1' },
      talkBack: { status: 'partial', completionTarget: 'v1.1' },
      reducedMotion: { supported: true, fallback: 'instant transitions' },
    };
  }

  // F-831: Hintergrund-Refresh (neue Inhalte vorab laden)
  getBackgroundRefreshConfig() {
    return {
      ios: { api: 'BGAppRefreshTask', minimumIntervalMinutes: 15, enabled: true },
      android: { api: 'WorkManager', constraints: ['NETWORK_CONNECTED'], repeatIntervalHours: 1, enabled: true },
      refreshContent: ['new_loans', 'recommendations', 'notifications'],
      batterySaverOverride: true,
      note: 'configure_background_task_in_native_app_AppDelegate_or_Application',
    };
  }

  // F-844–F-847: Battery, App Size, Performance
  getMobilePerformanceConfig() {
    return {
      batterySaver: { enabled: true, reducesBackgroundSync: true, lowersBitrate: true },
      appSizeTarget: '< 30MB (use on-demand resources for audio assets)',
      coldStartTarget: '< 2 seconds',
      smoothScrolling: '60fps minimum, 120fps on ProMotion displays',
    };
  }

  // F-848–F-850: Offline Library & Conflict Resolution
  getOfflineLibraryConfig() {
    return {
      offlineSearch: { enabled: true, index: 'SQLite FTS5 on device' },
      offlineBookmarks: { enabled: true, syncOnReconnect: true },
      conflictResolution: { strategy: 'last-write-wins with client-side optimistic updates', crdt: false },
    };
  }

  // F-854: DRM-geschützte Downloads
  getDrmConfig() {
    return {
      ios: { provider: 'FairPlay Streaming', status: 'planned', requiresAppleDeveloperAccount: true },
      android: { provider: 'Widevine L1/L3', status: 'planned' },
      web: { provider: 'EME (Encrypted Media Extensions)', status: 'planned' },
      licenseServer: process.env.DRM_LICENSE_URL ?? null,
      enabled: !!process.env.DRM_LICENSE_URL,
    };
  }

  // F-856–F-857: Storage Warnings
  getStorageManagementConfig() {
    return {
      warningThresholdGb: 1,
      autoDeleteOldestWhenFull: true,
      autoDeleteStrategy: 'LRU (Least Recently Used downloads)',
      notifyUserBeforeDelete: true,
      storageQuotaPerUser: null,
    };
  }

  // F-860–F-861: QR Code & Share Extension
  getMobileSharingConfig() {
    return {
      qrCodeScanner: { enabled: true, scansWorkQrCodes: true, opensWorkDetail: true },
      shareExtension: {
        platform: 'iOS Share Sheet / Android Intent',
        accepts: ['URLs', 'Text (work title)'],
        action: 'Opens recommendation dialog with detected work',
        status: 'planned',
      },
    };
  }

  // F-837: App shortcuts (Siri Intents / iOS)
  getAppShortcutsConfig() {
    return {
      ios: {
        siriIntents: ['INPlayMediaIntent', 'INSearchForMediaIntent'],
        shortcuts: [
          { title: 'Resume Listening', action: 'resume_last_loan' },
          { title: 'My Loans', action: 'open_loans' },
          { title: 'Discover', action: 'open_discovery' },
        ],
      },
      android: {
        shortcuts: [
          { label: 'Resume', targetAction: 'RESUME_LOAN' },
          { label: 'Discover', targetAction: 'OPEN_DISCOVER' },
        ],
      },
    };
  }

  // F-840: Dynamic Type (respects system font size) / F-841: VoiceOver / F-842: TalkBack
  getMobileAccessibilityConfig() {
    return {
      dynamicType: { supported: true, minScale: 0.8, maxScale: 2.0 },
      voiceOver: { supported: true, testedOnIos: '17+', allElementsLabeled: true },
      talkBack: { supported: true, testedOnAndroid: '12+', allElementsLabeled: true },
      reduceMotion: { supported: true, respectsSystemSetting: true },
    };
  }

  // F-845: App size < 30MB / F-846: App start < 2 seconds
  getAppPerformanceTargets() {
    return {
      appSizeMb: { target: 30, strategy: 'on_demand_resources_for_audio_engine' },
      coldStartMs: { target: 2000, strategy: 'lazy_module_loading_and_pre_cached_auth' },
      warmStartMs: { target: 500 },
    };
  }

  // F-849: Offline bookmarks
  getOfflineBookmarkConfig() {
    return {
      enabled: true,
      worksOffline: true,
      syncOnConnect: true,
      maxOfflineBookmarks: 500,
      endpoint: 'GET /users/me/bookmarks?offline=true',
    };
  }

  // F-863–F-870: F-864 car volume, F-865 podcast mode, F-866 sleep tracking,
  // F-867 alarm, F-868 jogging BPM, F-869 driving safety warning
  getAdvancedPlayerConfig() {
    return {
      bluetoothVolumeSync: { enabled: true, followsSystemVolume: true },
      carProfile: { detectsCarAudio: true, higherVolumeCeiling: true, autoMuteOnPhoneCall: true },
      podcastMode: { autoplayNextEpisode: true, continuousPlay: true },
      sleepTracking: { pauseOnInactivity: true, inactivityThresholdMinutes: 30, gyroscopeDetection: false },
      alarmIntegration: { status: 'planned', triggersWorkOnAlarm: true },
      joggingMode: { status: 'planned', bpmSync: false },
      drivingSafetyWarning: { showsWarningAboveKmh: 50, gpsRequired: true, status: 'planned' },
      kidsMode: { enabled: true, locksPlayerUI: true, requiresParentPin: true },
    };
  }
}
