import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { MobileService } from './mobile.service';

// GET /api/v1/mobile/manifest – PWA-Manifest (F-823)
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobile: MobileService) {}

  @Get('manifest')
  getManifest() {
    return this.mobile.getManifest();
  }

  @Get('offline')
  getOfflineInfo() {
    return this.mobile.getOfflineSupportInfo();
  }

  // F-858: Deep-Link-Auflösung
  @Get('deeplink')
  resolveDeeplink(@Query('path') path: string) {
    return this.mobile.getDeepLinkInfo(path ?? '/');
  }

  // F-827: Offline-Aktion einreihen
  @Post('offline/queue')
  @UseGuards(JwtAuthGuard)
  enqueue(
    @CurrentUser() user: { userId: string },
    @Body('type') type: string,
    @Body('payload') payload: Prisma.InputJsonValue,
  ) {
    return this.mobile.enqueueOfflineAction(user.userId, type, payload);
  }

  // F-828: Queue verarbeiten (Auto-Sync)
  @Post('offline/sync')
  @UseGuards(JwtAuthGuard)
  sync(@CurrentUser() user: { userId: string }) {
    return this.mobile.processOfflineQueue(user.userId);
  }

  // F-851: Delta-Sync
  @Get('sync/delta')
  @UseGuards(JwtAuthGuard)
  delta(@CurrentUser() user: { userId: string }, @Query('since') since: string) {
    return this.mobile.getDeltaSince(user.userId, since ?? new Date(0).toISOString());
  }

  // F-852/F-853: Download-Info
  @Get('works/:id/download')
  @UseGuards(JwtAuthGuard)
  downloadInfo(@Param('id') workId: string, @CurrentUser() user: { userId: string }) {
    return this.mobile.getDownloadInfo(workId, user.userId);
  }

  // F-855: Ablauf-Check
  @Get('downloads/expired')
  @UseGuards(JwtAuthGuard)
  expiredDownloads(@CurrentUser() user: { userId: string }) {
    return this.mobile.checkExpiredDownloads(user.userId);
  }

  // F-859: Universal Links / App Links Konfiguration
  @Get('universal-links')
  universalLinksConfig() {
    return this.mobile.getUniversalLinksConfig();
  }

  // F-051: Biometrische Auth Konfiguration
  @Get('biometric-auth')
  biometricAuthConfig() {
    return this.mobile.getBiometricAuthConfig();
  }

  // F-821–F-822: Native App Info
  @Get('native-app')
  nativeAppInfo() {
    return this.mobile.getNativeAppInfo();
  }

  // F-824–F-825: App Clip / Instant App
  @Get('instant-access')
  instantAccessInfo() {
    return this.mobile.getInstantAccessInfo();
  }

  // F-829: Datensparmodus-Konfiguration
  @Get('data-saver')
  dataSaverConfig() {
    return this.mobile.getDataSaverConfig();
  }

  // F-830: Wi-Fi-only Downloads
  @Get('wifi-only')
  wifiOnlyConfig() {
    return this.mobile.getWifiOnlyConfig();
  }

  // F-832–F-833: Widgets
  @Get('widgets')
  widgetConfig() {
    return this.mobile.getWidgetConfig();
  }

  // F-834–F-835: Dynamic Island / Live Activities
  @Get('live-activities')
  liveActivitiesConfig() {
    return this.mobile.getLiveActivitiesConfig();
  }

  // F-836–F-838: Notification Extensions & Shortcuts
  @Get('notifications/extensions')
  notificationExtensions() {
    return this.mobile.getNotificationExtensionConfig();
  }

  // F-839–F-843: Haptic, Dynamic Type, Accessibility
  @Get('accessibility')
  mobileA11yConfig() {
    return this.mobile.getMobileA11yConfig();
  }

  // F-844–F-847: Battery, App Size, Performance
  @Get('performance')
  mobilePerformanceConfig() {
    return this.mobile.getMobilePerformanceConfig();
  }

  // F-848–F-850: Offline Library & Conflict Resolution
  @Get('offline/library')
  offlineLibraryConfig() {
    return this.mobile.getOfflineLibraryConfig();
  }

  // F-854: DRM-Downloads
  @Get('drm')
  drmConfig() {
    return this.mobile.getDrmConfig();
  }

  // F-856–F-857: Storage Management
  @Get('storage')
  storageManagement() {
    return this.mobile.getStorageManagementConfig();
  }

  // F-860–F-861: QR Code & Share Extension
  @Get('sharing')
  mobileSharingConfig() {
    return this.mobile.getMobileSharingConfig();
  }

  // F-831: Hintergrund-Refresh
  @Get('background-refresh')
  backgroundRefresh() {
    return this.mobile.getBackgroundRefreshConfig();
  }

  // F-863–F-870: Advanced Player (Bluetooth, Car, Podcast, Sleep, etc.)
  @Get('player/advanced')
  advancedPlayerConfig() {
    return this.mobile.getAdvancedPlayerConfig();
  }
}
