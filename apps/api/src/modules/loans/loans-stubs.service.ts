import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub implementations for loans/player features F-253 to F-320.
 */
@Injectable()
export class LoansStubsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    try { return JSON.parse(row.value) as T; } catch { return fallback; }
  }

  private async setSetting(key: string, value: unknown): Promise<void> {
    const str = JSON.stringify(value);
    await this.prisma.appSetting.upsert({ where: { key }, create: { key, value: str }, update: { value: str } });
  }

  // F-253: Offline-Download (DRM-geschützt)
  async getOfflineDownloadInfo(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId }, include: { work: { select: { title: true, durationSeconds: true } } } });
    if (!loan || loan.userId !== userId) return null;
    return { loanId, workTitle: loan.work.title, downloadUrl: null, drmLicenseUrl: process.env.DRM_LICENSE_URL ?? null, offlineAvailable: false, message: 'DRM offline download requires FairPlay/Widevine license server – set DRM_LICENSE_URL' };
  }

  // F-254: Offline-Limit (max 10 Werke)
  async getOfflineDownloadCount(userId: string) {
    const key = `offline_downloads:${userId}`;
    const list = await this.getSetting<string[]>(key, []);
    return { userId, count: list.length, limit: 10, available: Math.max(0, 10 - list.length), downloads: list };
  }

  // F-255: Automatisches Löschen nach Ablauf
  async pruneExpiredOfflineDownloads(userId: string) {
    const expiredLoans = await this.prisma.loan.findMany({ where: { userId, status: 'EXPIRED' }, select: { id: true } });
    const key = `offline_downloads:${userId}`;
    const list = await this.getSetting<string[]>(key, []);
    const expiredIds = new Set(expiredLoans.map((l) => l.id));
    const pruned = list.filter((id) => expiredIds.has(id));
    const remaining = list.filter((id) => !expiredIds.has(id));
    await this.setSetting(key, remaining);
    return { pruned: pruned.length, remaining: remaining.length };
  }

  // F-256: Download-Qualität wählbar
  getDownloadQualityOptions() {
    return { options: [{ key: 'LOW', bitrateKbps: 64, label: 'Datensparmodus' }, { key: 'STANDARD', bitrateKbps: 128, label: 'Standard' }, { key: 'HIGH', bitrateKbps: 256, label: 'Hohe Qualität' }], default: 'STANDARD' };
  }

  async setDownloadQuality(userId: string, quality: 'LOW' | 'STANDARD' | 'HIGH') {
    await this.setSetting(`download_quality:${userId}`, quality);
    return { userId, quality };
  }

  // F-257: Hintergrund-Download
  getBackgroundDownloadConfig() {
    return { supported: true, platform: 'iOS via URLSession background / Android WorkManager', requiresWifi: true, message: 'Background download is a client-side feature; API delivers signed download URLs' };
  }

  // F-258: Download-Fortschritt-Widget
  getDownloadWidgetConfig() {
    return { widgetKind: 'DownloadProgressWidget', platforms: ['iOS 16+ WidgetKit', 'Android Glance API'], refreshInterval: 5, message: 'Widget reads download state from local DB; progress is a client concern' };
  }

  // F-261: Automatische Verlängerung
  async setAutoRenew(userId: string, loanId: string, enabled: boolean) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`auto_renew:${loanId}`, enabled);
    return { loanId, autoRenew: enabled };
  }

  // F-263: Verlängerung per Siri / Google Assistant
  getVoiceRenewConfig() {
    return {
      siri: { enabled: true, shortcut: 'Verlängerung bei CreatorLend', appIntentName: 'RenewLoanIntent' },
      googleAssistant: { enabled: false, message: 'Register Google Assistant action with Actions on Google' },
      flow: 'User triggers voice command → app deeplink → POST /api/v1/loans/:id/renew',
    };
  }

  // F-264: Exemplar-Modell (Ausleih-Limit je Werk)
  async getExemplarConfig(workId: string) {
    const key = `exemplar:${workId}`;
    const data = await this.getSetting<Record<string, unknown>>(key, { maxConcurrentLoans: null, currentLoans: 0 });
    return { workId, ...data, message: 'Exemplar model stub – implement concurrent loan count check in borrow() if maxConcurrentLoans is set' };
  }

  // F-265: Warteliste
  async joinWaitlist(userId: string, workId: string) {
    const key = `waitlist:${workId}`;
    const list = await this.getSetting<string[]>(key, []);
    if (!list.includes(userId)) list.push(userId);
    await this.setSetting(key, list);
    return { workId, userId, position: list.indexOf(userId) + 1, totalWaiting: list.length };
  }

  async getWaitlistPosition(userId: string, workId: string) {
    const list = await this.getSetting<string[]>(`waitlist:${workId}`, []);
    const pos = list.indexOf(userId);
    return { workId, userId, position: pos === -1 ? null : pos + 1, totalWaiting: list.length };
  }

  // F-266: Benachrichtigung wenn Exemplar frei (stub – scheduler does this)
  getWaitlistNotifyConfig() {
    return { method: 'Scheduler checks waitlist hourly; triggers NotificationsService.send() when slot available', notificationType: 'LOAN_EXPIRING' };
  }

  // F-269: Max. Pause-Dauer konfigurierbar
  async getPauseConfig() {
    const maxDays = await this.getSetting<number>('loan_max_pause_days', 14);
    return { maxPauseDays: maxDays, message: 'Configure via AppSetting loan_max_pause_days' };
  }

  // F-272: Gehör-Tagebuch (chronologische abgeschlossene Leihen)
  async getListeningDiary(userId: string, page = 1, limit = 20) {
    const loans = await this.prisma.loan.findMany({ where: { userId, status: 'EXPIRED' }, orderBy: { expiresAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { work: { select: { id: true, title: true, type: true, coverKey: true } } } });
    return { page, limit, diary: loans.map((l) => ({ loanId: l.id, work: l.work, borrowedAt: l.createdAt, expiredAt: l.expiresAt })) };
  }

  // F-277: Abspielposition in iCloud / Google Drive sichern
  getCloudSyncConfig() {
    return { iCloud: { enabled: false, keyValueStore: 'NSUbiquitousKeyValueStore', dataKey: 'playback_positions', message: 'Implement on iOS client; API position endpoint already syncs server-side' }, googleDrive: { enabled: false, message: 'Use Google Drive AppData folder for cross-platform backup of positions' } };
  }

  // F-278: Mehrere Lesezeichen je Leihe
  async getLoanBookmarks(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error('not_found_or_forbidden');
    const bookmarks = await this.prisma.bookmark.findMany({ where: { userId, workId: loan.workId }, orderBy: { positionSeconds: 'asc' } });
    return { loanId, bookmarks };
  }

  // F-279: Lesezeichen mit Notiz (label field on Bookmark)
  async addLoanBookmark(userId: string, loanId: string, positionSeconds: number, label?: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error('not_found_or_forbidden');
    const bookmark = await this.prisma.bookmark.create({ data: { userId, workId: loan.workId, positionSeconds, label: label ?? null } });
    return bookmark;
  }

  // F-280: Lesezeichen exportieren (CSV)
  async exportLoanBookmarksCsv(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({ where: { userId }, include: { work: { select: { title: true } } }, orderBy: { createdAt: 'asc' } });
    const header = 'work_title,position_seconds,label,created_at';
    const rows = bookmarks.map((b) => `"${b.work.title}",${b.positionSeconds},"${b.label ?? ''}","${b.createdAt.toISOString()}"`);
    return { contentType: 'text/csv', filename: 'bookmarks.csv', content: [header, ...rows].join('\n') };
  }

  // F-282: Sanftes Ausblenden des Schlaf-Timers
  getSleepTimerFadeConfig() {
    return { fadeEnabled: true, fadeDurationSeconds: 10, minVolume: 0, implementation: 'Client-side volume ramp using AudioContext.gain or AVAudioPlayer volume property' };
  }

  // F-285: Stille überspringen (Auto-Silence-Skip)
  getSilenceSkipConfig() {
    return { supported: true, thresholdDb: -40, minSilenceDurationMs: 500, speedUp: 2.0, message: 'Silence detection is a client-side audio feature using AVFoundation or ExoPlayer' };
  }

  // F-286: Kapitel überspringen
  getChapterSkipConfig() {
    return { supported: true, method: 'Client reads /api/v1/works/:id/chapters, jumps positionSeconds to next chapter', keyboardShortcut: 'Right arrow (desktop), long-press skip (mobile)' };
  }

  // F-288: 30s-Replay per Kopfhörer-Doppelklick
  getHeadphoneControlConfig() {
    return { doubleTap: 'replay 30 seconds', tripleTap: 'skip 30 seconds', holdPlay: 'activate Siri (iOS)', platform: 'iOS AVAudioSession / Android MediaBrowserService', implementation: 'Register MPRemoteCommandCenter (iOS) or MediaSession (web/Android)' };
  }

  // F-289: Equalizer mit Voreinstellungen
  getEqualizerConfig() {
    return { presets: [{ name: 'Flat', bands: [] }, { name: 'Bass Boost', bands: [{ hz: 60, db: 6 }, { hz: 170, db: 4 }] }, { name: 'Podcast', bands: [{ hz: 250, db: -2 }, { hz: 1000, db: 3 }, { hz: 3000, db: 2 }] }, { name: 'Treble Boost', bands: [{ hz: 6000, db: 4 }, { hz: 14000, db: 5 }] }], message: 'EQ is a client-side audio feature (AVAudioUnitEQ on iOS, AudioEffect on Android, Web Audio API on web)' };
  }

  // F-290: Lautstärke-Normalisierung
  getLoudnessNormalizationConfig() {
    return { enabled: true, standard: 'EBU R128', targetLUFS: -14, method: 'ReplayGain metadata in media file + AVAudioPlayer volume scaling', message: 'Normalization values computed post-upload by audio analysis worker' };
  }

  // F-291: Crossfade
  getCrossfadeConfig() {
    return { enabled: false, durationSeconds: 5, message: 'Crossfade is a client-side feature using overlapping audio streams / AudioContext scheduling' };
  }

  // F-292: Gapless Playback
  getGaplessPlaybackConfig() {
    return { enabled: true, method: 'Pre-buffer next episode before current ends (last 10 seconds)', preBufferSeconds: 10, message: 'Implemented on client side using AVQueuePlayer (iOS) or ExoPlayer concatenation (Android)' };
  }

  // F-294: Queue speichern und benennen
  async saveQueue(userId: string, name: string, workIds: string[]) {
    const key = `saved_queue:${userId}:${Date.now()}`;
    const data = { name, workIds, createdAt: new Date().toISOString() };
    await this.setSetting(key, data);
    return { queueId: key, name, workIds };
  }

  async getSavedQueues(userId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `saved_queue:${userId}:` } } });
    return rows.map((r) => { try { return { key: r.key, ...JSON.parse(r.value) }; } catch { return null; } }).filter(Boolean);
  }

  // F-295: Up-Next-Vorschau
  async getUpNextPreview(userId: string) {
    const queueKey = `playback_queue:${userId}`;
    const queue = await this.getSetting<string[]>(queueKey, []);
    if (!queue.length) return { upNext: null };
    const work = await this.prisma.work.findUnique({ where: { id: queue[0] }, select: { id: true, title: true, type: true, coverKey: true } });
    return { upNext: work, queueLength: queue.length };
  }

  // F-296: Shuffle-Mode
  async setShuffleMode(userId: string, enabled: boolean) {
    await this.setSetting(`shuffle:${userId}`, enabled);
    return { userId, shuffle: enabled };
  }

  // F-297: Repeat-Mode
  async setRepeatMode(userId: string, mode: 'OFF' | 'ONE' | 'ALL') {
    await this.setSetting(`repeat:${userId}`, mode);
    return { userId, repeat: mode };
  }

  // F-298: CarPlay / Android Auto
  getCarPlayConfig() {
    return { carPlay: { supported: true, contentStyle: 'list', maxItems: 20, requiresEntitlement: 'com.apple.developer.carplay-audio', message: 'Implement MPPlayableContentManager (deprecated) or CarPlay Streaming in Swift' }, androidAuto: { supported: true, framework: 'MediaBrowserService + MediaSession API', searchEnabled: true } };
  }

  // F-299: Apple Watch App
  getAppleWatchConfig() {
    return { supported: false, status: 'planned', controls: ['play/pause', 'skip', 'chapter navigation', 'sleep timer'], framework: 'WatchKit / SwiftUI on watchOS 9+' };
  }

  // F-301: AirPlay 2
  getAirPlayConfig() {
    return { supported: true, type: 'AirPlay 2 audio streaming', implementation: 'Automatic via AVPlayer on iOS – ensure AVAudioSession category is set to .playback', multiRoomAudio: true };
  }

  // F-304: Now-Playing-Widget
  getNowPlayingWidgetConfig() {
    return { ios: { framework: 'MPNowPlayingInfoCenter', requiredKeys: ['MPMediaItemPropertyTitle', 'MPMediaItemPropertyArtist', 'MPNowPlayingInfoPropertyElapsedPlaybackTime', 'MPMediaItemPropertyPlaybackDuration'] }, android: { framework: 'MediaSession API', notification: 'MediaStyle notification with large artwork' }, web: { framework: 'Media Session API (navigator.mediaSession)' } };
  }

  // F-305: Lock-Screen-Controls
  getLockScreenConfig() {
    return { ios: { automatic: true, requiresAudioSessionCategory: 'AVAudioSessionCategoryPlayback' }, android: { notification: 'Persistent MediaStyle notification', autoHide: false }, controls: ['play/pause', 'skip-15s', '+30s', 'chapter-previous', 'chapter-next'] };
  }

  // F-307: Google Assistant
  getGoogleAssistantConfig() {
    return { appActions: { supported: false, status: 'planned', intentName: 'actions.intent.OPEN_APP_FEATURE', feature: 'PLAY_MEDIA', deepLink: 'creatorlend://playback/resume' }, message: 'Register App Action at https://assistant.google.com/intents/' };
  }

  // F-308: Alexa Skill
  getAlexaConfig() {
    return { skillId: null, status: 'planned', invocationName: 'CreatorLend', intentExamples: ['Alexa, öffne CreatorLend und spiele weiter', 'Alexa, verlängere meine Leihe'], message: 'Register Alexa Skill with Amazon Developer Console' };
  }

  // F-309: Smart Speaker Integration
  getSmartSpeakerConfig() {
    return { homePod: { supported: false, message: 'HomePod audio requires AirPlay 2 – same as F-301' }, googleHome: { supported: false, message: 'Requires Google Cast SDK integration' }, amazonEcho: { supported: false, message: 'Requires Alexa Skill (F-308)' } };
  }

  // F-311: DLNA / UPnP
  getDlnaConfig() {
    return { supported: false, status: 'planned', protocol: 'DLNA / UPnP AV', message: 'DLNA streaming requires running a UPnP media server (e.g. MiniDLNA / Jellyfin) that proxies signed CDN URLs' };
  }

  // F-312: TV-Streaming (Chromecast)
  getChromeCastConfig() {
    return { supported: false, status: 'planned', framework: 'Google Cast SDK', receiverAppId: null, message: 'Register Cast receiver app at Google Cast SDK Developer Console' };
  }

  // F-313: Familienfreigabe
  async createFamilyGroup(adminUserId: string, memberIds: string[]) {
    await this.setSetting(`family_group:${adminUserId}`, { admin: adminUserId, members: memberIds, createdAt: new Date().toISOString() });
    return { admin: adminUserId, members: memberIds, message: 'Family sharing stub – shared quota requires subscription linking logic' };
  }

  async getFamilyGroup(userId: string) {
    const asAdmin = await this.getSetting<Record<string, unknown>>(`family_group:${userId}`, { admin: null, members: [] });
    return { group: asAdmin.admin ? asAdmin : null, message: 'Family sharing stub' };
  }

  // F-314: Kinder-Profil
  async setKidsProfile(userId: string, childProfileId: string, config: { maxAgeRating: string; restrictedCategories: string[] }) {
    await this.setSetting(`kids_profile:${childProfileId}`, { parentId: userId, ...config });
    return { childProfileId, config };
  }

  // F-315: Zeitbegrenzung Kinder-Profil
  async setKidsTimeLimit(userId: string, childProfileId: string, dailyLimitMinutes: number) {
    const key = `kids_profile:${childProfileId}`;
    const current = await this.getSetting<Record<string, unknown>>(key, {});
    await this.setSetting(key, { ...current, dailyLimitMinutes });
    return { childProfileId, dailyLimitMinutes };
  }

  // F-316: Eltern-Dashboard
  async getKidsDashboard(parentId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `kids_profile:` } } });
    const childProfiles = rows.map((r) => { try { const d = JSON.parse(r.value); if (d.parentId === parentId) return { profileId: r.key.replace('kids_profile:', ''), ...d }; return null; } catch { return null; } }).filter(Boolean);
    return { parentId, childProfiles };
  }

  // F-319: Inkognito-Modus für einzelne Leihe
  async setLoanIncognito(userId: string, loanId: string, incognito: boolean) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`incognito:${loanId}`, incognito);
    return { loanId, incognito, message: 'Incognito loan excluded from listening history and recommendations' };
  }
}
