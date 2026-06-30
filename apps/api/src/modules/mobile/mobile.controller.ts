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
}
