import { Body, Controller, Delete, Get, Header, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { LoansService } from "./loans.service";
import { LoanGiftsService } from "./loan-gifts.service";
import { SingleLoanService } from "./single-loan.service";
import { DownloadService } from "./download.service";
import { LoansStubsService } from "./loans-stubs.service";
import { ListenerExperienceService } from "./listener-experience.service";
import { BorrowDto } from "./dto/borrow.dto";
import { ExchangeDto } from "./dto/exchange.dto";

/** Endpunkte rund um das Leihen von Werken (nur Hörer:innen). */
@ApiTags("loans")
@Controller("loans")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly loanGifts: LoanGiftsService,
    private readonly singleLoan: SingleLoanService,
    private readonly download: DownloadService,
    private readonly stubs: LoansStubsService,
    private readonly listenerExp: ListenerExperienceService,
  ) {}

  // GET /api/v1/loans/expired-check – prüfen welche Ausleihen abgelaufen sind (F-855)
  @Get("expired-check")
  checkExpiredDownloads(@CurrentUser() userId: string) {
    return this.download.checkExpiredDownloads(userId);
  }

  // POST /api/v1/loans – Werk leihen
  @Post()
  create(@CurrentUser() userId: string, @Body() body: BorrowDto) {
    return this.loans.borrow(userId, body.workId);
  }

  // POST /api/v1/loans/purchase – Pay-per-loan: Kauf einleiten (F-321)
  @Post("purchase")
  initiatePurchase(@CurrentUser() userId: string, @Body("workId") workId: string) {
    return this.singleLoan.initiatePurchase(userId, workId);
  }

  // POST /api/v1/loans/purchase/:id/complete – Pay-per-loan: Kauf abschließen (F-321)
  @Post("purchase/:id/complete")
  completePurchase(@Param("id") id: string) {
    return this.singleLoan.completePurchase(id);
  }

  // GET /api/v1/loans?status=ACTIVE – eigene Ausleihen
  @Get()
  list(@CurrentUser() userId: string, @Query("status") status?: string) {
    return this.loans.listForUser(userId, status);
  }

  // GET /api/v1/loans/stats – Hör-Statistiken (F-270-272)
  @Get("stats")
  listeningStats(@CurrentUser() userId: string) {
    return this.loans.getListeningStats(userId);
  }

  // GET /api/v1/loans/year-in-review?year=2026 – Jahresrückblick (F-271)
  @Get("year-in-review")
  yearInReview(@CurrentUser() userId: string, @Query("year") year?: string) {
    return this.loans.getYearInReview(userId, year ? Number(year) : new Date().getFullYear());
  }

  // GET /api/v1/loans/:id/download – Download-URL für eine Leihe (F-852/F-853)
  @Get(":id/download")
  getDownloadUrl(@CurrentUser() userId: string, @Param("id") loanId: string) {
    return this.download.getDownloadUrl(userId, loanId);
  }

  // GET /api/v1/loans/:id
  @Get(":id")
  get(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getForUser(userId, id);
  }

  // DELETE /api/v1/loans/:id – Stornieren innerhalb Kulanzfrist (B-081)
  @Delete(":id")
  cancel(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.cancel(userId, id);
  }

  // POST /api/v1/loans/:id/renew – Verlängern (erneute Vergütung)
  @Post(":id/renew")
  renew(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.renew(userId, id);
  }

  // POST /api/v1/loans/:id/exchange – Tauschen gegen anderes Werk (B-078)
  @Post(":id/exchange")
  exchange(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: ExchangeDto,
  ) {
    return this.loans.exchange(userId, id, body.newWorkId, body.countsAgainstQuota ?? false);
  }

  // PUT /api/v1/loans/:id/progress – Abspielposition speichern (B-073)
  @Put(":id/progress")
  saveProgress(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("positionSeconds") positionSeconds: number,
  ) {
    return this.loans.saveProgress(userId, id, positionSeconds);
  }

  // GET /api/v1/loans/:id/progress – gespeicherte Position abrufen (B-073)
  @Get(":id/progress")
  getProgress(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getProgress(userId, id);
  }

  // ─── F-251/F-252: Multi-device loan access ─────────────────────────────

  // POST /api/v1/loans/:id/devices – Gerät registrieren
  @Post(":id/devices")
  registerDevice(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("deviceId") deviceId: string,
    @Body("userAgent") userAgent?: string,
  ) {
    return this.loans.registerDevice(userId, id, deviceId, userAgent);
  }

  // GET /api/v1/loans/:id/devices – Geräte auflisten
  @Get(":id/devices")
  getDevices(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getDevices(userId, id);
  }

  // ─── F-267: Loan Pause (Vacation Mode) ─────────────────────────────────

  // POST /api/v1/loans/:id/pause – Leihe pausieren
  @Post(":id/pause")
  pause(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("days") days: number,
  ) {
    return this.loans.pause(userId, id, days);
  }

  // POST /api/v1/loans/:id/resume – Leihe-Pause beenden
  @Post(":id/resume")
  resume(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.resume(userId, id);
  }

  // ─── F-260: Scheduled/Reserved Loan ────────────────────────────────────

  // POST /api/v1/loans/reserve – Reservierung anlegen
  @Post("reserve")
  reserve(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("scheduledAt") scheduledAt: string,
  ) {
    return this.loans.reserve(userId, workId, new Date(scheduledAt));
  }

  // DELETE /api/v1/loans/reserve/:id – Reservierung stornieren
  @Delete("reserve/:id")
  cancelReservation(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.cancelReservation(userId, id);
  }

  // GET /api/v1/loans/reservations – Reservierungen auflisten
  @Get("reservations")
  listReservations(@CurrentUser() userId: string) {
    return this.loans.listReservations(userId);
  }

  // ─── F-259: Gift a Loan ─────────────────────────────────────────────────

  // POST /api/v1/loans/gifts/send – Leihe verschenken
  @Post("gifts/send")
  sendGift(
    @CurrentUser() userId: string,
    @Body("recipientId") recipientId: string,
    @Body("workId") workId: string,
    @Body("message") message?: string,
  ) {
    return this.loanGifts.send(userId, recipientId, workId, message);
  }

  // POST /api/v1/loans/gifts/:id/accept – Geschenk annehmen
  @Post("gifts/:id/accept")
  acceptGift(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loanGifts.accept(userId, id);
  }

  // POST /api/v1/loans/gifts/:id/decline – Geschenk ablehnen
  @Post("gifts/:id/decline")
  declineGift(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loanGifts.decline(userId, id);
  }

  // GET /api/v1/loans/gifts/received – empfangene Geschenke
  @Get("gifts/received")
  listReceivedGifts(@CurrentUser() userId: string) {
    return this.loanGifts.listReceived(userId);
  }

  // GET /api/v1/loans/gifts/sent – gesendete Geschenke
  @Get("gifts/sent")
  listSentGifts(@CurrentUser() userId: string) {
    return this.loanGifts.listSent(userId);
  }

  // POST /api/v1/loans/gift – Leihe verschenken (F-239)
  @Post("gift")
  giftLoan(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("recipientEmail") recipientEmail: string,
  ) {
    return this.loans.giftLoan(userId, workId, recipientEmail);
  }

  // DELETE /api/v1/loans/history – Leihe-Verlauf löschen (F-317)
  @Delete("history")
  clearLoanHistory(@CurrentUser() userId: string) {
    return this.loans.clearLoanHistory(userId);
  }

  // POST /api/v1/loans/private-mode – privaten Hör-Modus setzen (F-318)
  @Post("private-mode")
  setPrivateMode(@CurrentUser() userId: string, @Body("enabled") enabled: boolean) {
    return this.loans.setPrivateListeningMode(userId, enabled);
  }

  // GET /api/v1/loans/stats/share – teilbare Jahresstatistiken (F-552/F-553)
  @Get("stats/share")
  getShareableStats(@CurrentUser() userId: string, @Query("year") year?: string) {
    return this.loans.getShareableStats(userId, year ? Number(year) : undefined);
  }

  // ─── F-253/F-254/F-255: Offline Downloads ──────────────────────────────

  // GET /api/v1/loans/:id/offline – Offline-Download-Info (F-253)
  @Get(":id/offline")
  getOfflineDownloadInfo(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.stubs.getOfflineDownloadInfo(userId, id);
  }

  // GET /api/v1/loans/offline/count – Offline-Limit (F-254)
  @Get("offline/count")
  getOfflineDownloadCount(@CurrentUser() userId: string) {
    return this.stubs.getOfflineDownloadCount(userId);
  }

  // DELETE /api/v1/loans/offline/prune – abgelaufene Offline-Downloads löschen (F-255)
  @Delete("offline/prune")
  pruneExpiredOfflineDownloads(@CurrentUser() userId: string) {
    return this.stubs.pruneExpiredOfflineDownloads(userId);
  }

  // GET /api/v1/loans/offline/quality-options – Download-Qualitäts-Optionen (F-256)
  @Get("offline/quality-options")
  getDownloadQualityOptions() {
    return this.stubs.getDownloadQualityOptions();
  }

  // PUT /api/v1/loans/offline/quality – Download-Qualität setzen (F-256)
  @Put("offline/quality")
  setDownloadQuality(@CurrentUser() userId: string, @Body("quality") quality: 'LOW' | 'STANDARD' | 'HIGH') {
    return this.stubs.setDownloadQuality(userId, quality);
  }

  // GET /api/v1/loans/offline/background-config – Hintergrund-Download-Konfig (F-257)
  @Get("offline/background-config")
  getBackgroundDownloadConfig() {
    return this.stubs.getBackgroundDownloadConfig();
  }

  // GET /api/v1/loans/offline/widget-config – Download-Widget-Konfig (F-258)
  @Get("offline/widget-config")
  getDownloadWidgetConfig() {
    return this.stubs.getDownloadWidgetConfig();
  }

  // ─── F-261: Auto-Renew ──────────────────────────────────────────────────

  // PUT /api/v1/loans/:id/auto-renew – Automatische Verlängerung (F-261)
  @Put(":id/auto-renew")
  setAutoRenew(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("enabled") enabled: boolean,
  ) {
    return this.stubs.setAutoRenew(userId, id, enabled);
  }

  // GET /api/v1/loans/config/voice-renew – Voice-Renew-Konfig (F-263)
  @Get("config/voice-renew")
  getVoiceRenewConfig() {
    return this.stubs.getVoiceRenewConfig();
  }

  // ─── F-264/F-265/F-266: Exemplar & Waitlist ────────────────────────────

  // GET /api/v1/loans/exemplar/:workId – Exemplar-Konfig (F-264)
  @Get("exemplar/:workId")
  getExemplarConfig(@Param("workId") workId: string) {
    return this.stubs.getExemplarConfig(workId);
  }

  // POST /api/v1/loans/waitlist/:workId – Warteliste beitreten (F-265)
  @Post("waitlist/:workId")
  joinWaitlist(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.stubs.joinWaitlist(userId, workId);
  }

  // GET /api/v1/loans/waitlist/:workId/position – Wartelistenposition (F-265)
  @Get("waitlist/:workId/position")
  getWaitlistPosition(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.stubs.getWaitlistPosition(userId, workId);
  }

  // GET /api/v1/loans/config/waitlist-notify – Wartelisten-Benachrichtigungskonfig (F-266)
  @Get("config/waitlist-notify")
  getWaitlistNotifyConfig() {
    return this.stubs.getWaitlistNotifyConfig();
  }

  // GET /api/v1/loans/config/pause – Max. Pause-Dauer Konfig (F-269)
  @Get("config/pause")
  getPauseConfig() {
    return this.stubs.getPauseConfig();
  }

  // ─── F-272: Gehör-Tagebuch ──────────────────────────────────────────────

  // GET /api/v1/loans/diary – Gehör-Tagebuch (F-272)
  @Get("diary")
  getListeningDiary(
    @CurrentUser() userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stubs.getListeningDiary(userId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  // GET /api/v1/loans/config/cloud-sync – Cloud-Sync-Konfig (F-277)
  @Get("config/cloud-sync")
  getCloudSyncConfig() {
    return this.stubs.getCloudSyncConfig();
  }

  // ─── F-278/F-279/F-280: Loan Bookmarks ─────────────────────────────────

  // GET /api/v1/loans/:id/bookmarks – Lesezeichen je Leihe (F-278)
  @Get(":id/bookmarks")
  getLoanBookmarks(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.stubs.getLoanBookmarks(userId, id);
  }

  // POST /api/v1/loans/:id/bookmarks – Lesezeichen mit Notiz hinzufügen (F-279)
  @Post(":id/bookmarks")
  addLoanBookmark(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("positionSeconds") positionSeconds: number,
    @Body("label") label?: string,
  ) {
    return this.stubs.addLoanBookmark(userId, id, positionSeconds, label);
  }

  // GET /api/v1/loans/bookmarks/export – Lesezeichen exportieren (F-280)
  @Get("bookmarks/export")
  @Header("Content-Disposition", "attachment; filename=bookmarks.csv")
  exportLoanBookmarksCsv(@CurrentUser() userId: string) {
    return this.stubs.exportLoanBookmarksCsv(userId);
  }

  // ─── F-282: Sleep-Timer Fade ────────────────────────────────────────────

  // GET /api/v1/loans/config/sleep-timer-fade – Schlaf-Timer-Ausblenden-Konfig (F-282)
  @Get("config/sleep-timer-fade")
  getSleepTimerFadeConfig() {
    return this.stubs.getSleepTimerFadeConfig();
  }

  // ─── F-285/F-286/F-288-292: Player Config ──────────────────────────────

  // GET /api/v1/loans/config/silence-skip – Stille überspringen (F-285)
  @Get("config/silence-skip")
  getSilenceSkipConfig() {
    return this.stubs.getSilenceSkipConfig();
  }

  // GET /api/v1/loans/config/chapter-skip – Kapitel überspringen (F-286)
  @Get("config/chapter-skip")
  getChapterSkipConfig() {
    return this.stubs.getChapterSkipConfig();
  }

  // GET /api/v1/loans/config/headphone-controls – Kopfhörer-Steuerung (F-288)
  @Get("config/headphone-controls")
  getHeadphoneControlConfig() {
    return this.stubs.getHeadphoneControlConfig();
  }

  // GET /api/v1/loans/config/equalizer – Equalizer-Konfig (F-289)
  @Get("config/equalizer")
  getEqualizerConfig() {
    return this.stubs.getEqualizerConfig();
  }

  // GET /api/v1/loans/config/loudness-normalization – Lautstärke-Normalisierung (F-290)
  @Get("config/loudness-normalization")
  getLoudnessNormalizationConfig() {
    return this.stubs.getLoudnessNormalizationConfig();
  }

  // GET /api/v1/loans/config/crossfade – Crossfade-Konfig (F-291)
  @Get("config/crossfade")
  getCrossfadeConfig() {
    return this.stubs.getCrossfadeConfig();
  }

  // GET /api/v1/loans/config/gapless-playback – Gapless Playback (F-292)
  @Get("config/gapless-playback")
  getGaplessPlaybackConfig() {
    return this.stubs.getGaplessPlaybackConfig();
  }

  // ─── F-294/F-295/F-296/F-297: Queue & Shuffle ──────────────────────────

  // POST /api/v1/loans/queue/save – Queue speichern (F-294)
  @Post("queue/save")
  saveQueue(
    @CurrentUser() userId: string,
    @Body("name") name: string,
    @Body("workIds") workIds: string[],
  ) {
    return this.stubs.saveQueue(userId, name, workIds);
  }

  // GET /api/v1/loans/queue/saved – gespeicherte Queues (F-294)
  @Get("queue/saved")
  getSavedQueues(@CurrentUser() userId: string) {
    return this.stubs.getSavedQueues(userId);
  }

  // GET /api/v1/loans/queue/up-next – Up-Next-Vorschau (F-295)
  @Get("queue/up-next")
  getUpNextPreview(@CurrentUser() userId: string) {
    return this.stubs.getUpNextPreview(userId);
  }

  // PUT /api/v1/loans/playback/shuffle – Shuffle-Mode (F-296)
  @Put("playback/shuffle")
  setShuffleMode(@CurrentUser() userId: string, @Body("enabled") enabled: boolean) {
    return this.stubs.setShuffleMode(userId, enabled);
  }

  // PUT /api/v1/loans/playback/repeat – Repeat-Mode (F-297)
  @Put("playback/repeat")
  setRepeatMode(@CurrentUser() userId: string, @Body("mode") mode: 'OFF' | 'ONE' | 'ALL') {
    return this.stubs.setRepeatMode(userId, mode);
  }

  // ─── F-298/F-299/F-301/F-304/F-305/F-307-309/F-311/F-312: Device Integration

  // GET /api/v1/loans/config/carplay – CarPlay / Android Auto (F-298)
  @Get("config/carplay")
  getCarPlayConfig() {
    return this.stubs.getCarPlayConfig();
  }

  // GET /api/v1/loans/config/apple-watch – Apple Watch (F-299)
  @Get("config/apple-watch")
  getAppleWatchConfig() {
    return this.stubs.getAppleWatchConfig();
  }

  // GET /api/v1/loans/config/airplay – AirPlay 2 (F-301)
  @Get("config/airplay")
  getAirPlayConfig() {
    return this.stubs.getAirPlayConfig();
  }

  // GET /api/v1/loans/config/now-playing – Now-Playing-Widget (F-304)
  @Get("config/now-playing")
  getNowPlayingWidgetConfig() {
    return this.stubs.getNowPlayingWidgetConfig();
  }

  // GET /api/v1/loans/config/lock-screen – Lock-Screen-Controls (F-305)
  @Get("config/lock-screen")
  getLockScreenConfig() {
    return this.stubs.getLockScreenConfig();
  }

  // GET /api/v1/loans/config/google-assistant – Google Assistant (F-307)
  @Get("config/google-assistant")
  getGoogleAssistantConfig() {
    return this.stubs.getGoogleAssistantConfig();
  }

  // GET /api/v1/loans/config/alexa – Alexa Skill (F-308)
  @Get("config/alexa")
  getAlexaConfig() {
    return this.stubs.getAlexaConfig();
  }

  // GET /api/v1/loans/config/smart-speaker – Smart Speaker (F-309)
  @Get("config/smart-speaker")
  getSmartSpeakerConfig() {
    return this.stubs.getSmartSpeakerConfig();
  }

  // GET /api/v1/loans/config/dlna – DLNA / UPnP (F-311)
  @Get("config/dlna")
  getDlnaConfig() {
    return this.stubs.getDlnaConfig();
  }

  // GET /api/v1/loans/config/chromecast – Chromecast (F-312)
  @Get("config/chromecast")
  getChromeCastConfig() {
    return this.stubs.getChromeCastConfig();
  }

  // ─── F-313/F-314/F-315/F-316: Family & Kids ────────────────────────────

  // POST /api/v1/loans/family/group – Familiengruppe anlegen (F-313)
  @Post("family/group")
  createFamilyGroup(
    @CurrentUser() userId: string,
    @Body("memberIds") memberIds: string[],
  ) {
    return this.stubs.createFamilyGroup(userId, memberIds);
  }

  // GET /api/v1/loans/family/group – Familiengruppe abrufen (F-313)
  @Get("family/group")
  getFamilyGroup(@CurrentUser() userId: string) {
    return this.stubs.getFamilyGroup(userId);
  }

  // PUT /api/v1/loans/family/kids/:childId – Kinder-Profil setzen (F-314)
  @Put("family/kids/:childId")
  setKidsProfile(
    @CurrentUser() userId: string,
    @Param("childId") childProfileId: string,
    @Body("maxAgeRating") maxAgeRating: string,
    @Body("restrictedCategories") restrictedCategories: string[],
  ) {
    return this.stubs.setKidsProfile(userId, childProfileId, { maxAgeRating, restrictedCategories });
  }

  // PUT /api/v1/loans/family/kids/:childId/time-limit – Kinder-Zeitlimit (F-315)
  @Put("family/kids/:childId/time-limit")
  setKidsTimeLimit(
    @CurrentUser() userId: string,
    @Param("childId") childProfileId: string,
    @Body("dailyLimitMinutes") dailyLimitMinutes: number,
  ) {
    return this.stubs.setKidsTimeLimit(userId, childProfileId, dailyLimitMinutes);
  }

  // GET /api/v1/loans/family/dashboard – Eltern-Dashboard (F-316)
  @Get("family/dashboard")
  getKidsDashboard(@CurrentUser() userId: string) {
    return this.stubs.getKidsDashboard(userId);
  }

  // ─── F-319: Inkognito-Modus ─────────────────────────────────────────────

  // PUT /api/v1/loans/:id/incognito – Inkognito-Modus für Leihe (F-319)
  @Put(":id/incognito")
  setLoanIncognito(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("incognito") incognito: boolean,
  ) {
    return this.stubs.setLoanIncognito(userId, id, incognito);
  }

  // ─── F-501–510: UI-Präferenzen ──────────────────────────────────────────

  @Get("preferences/ui")
  getUiPreferences(@CurrentUser() userId: string) {
    return this.listenerExp.getUiPreferences(userId);
  }

  @Put("preferences/ui")
  setUiPreferences(@CurrentUser() userId: string, @Body() prefs: Record<string, unknown>) {
    return this.listenerExp.setUiPreferences(userId, prefs);
  }

  @Get("preferences/dark-mode")
  getDarkMode(@CurrentUser() userId: string) {
    return this.listenerExp.getDarkMode(userId);
  }

  @Put("preferences/dark-mode")
  setDarkMode(@CurrentUser() userId: string, @Body("mode") mode: string) {
    return this.listenerExp.setDarkMode(userId, mode);
  }

  @Get("preferences/theme-time")
  getThemeTimeConfig(@CurrentUser() userId: string) {
    return this.listenerExp.getThemeTimeBasedConfig(userId);
  }

  @Put("preferences/theme-time")
  setThemeTimeConfig(@CurrentUser() userId: string, @Body() config: Record<string, unknown>) {
    return this.listenerExp.setThemeTimeBasedConfig(userId, config);
  }

  @Get("preferences/accessibility")
  getAccessibilitySettings(@CurrentUser() userId: string) {
    return this.listenerExp.getAccessibilitySettings(userId);
  }

  @Put("preferences/accessibility")
  setAccessibilitySettings(@CurrentUser() userId: string, @Body() settings: Record<string, unknown>) {
    return this.listenerExp.setAccessibilitySettings(userId, settings);
  }

  @Get("preferences/font")
  getFontPreferences(@CurrentUser() userId: string) {
    return this.listenerExp.getFontPreferences(userId);
  }

  @Put("preferences/font")
  setFontPreferences(@CurrentUser() userId: string, @Body() fontPrefs: Record<string, unknown>) {
    return this.listenerExp.setFontPreferences(userId, fontPrefs);
  }

  @Get("preferences/ambient")
  getAmbientSoundConfig(@CurrentUser() userId: string) {
    return this.listenerExp.getAmbientSoundConfig(userId);
  }

  @Put("preferences/ambient")
  setAmbientSoundConfig(@CurrentUser() userId: string, @Body() config: Record<string, unknown>) {
    return this.listenerExp.setAmbientSoundConfig(userId, config);
  }

  @Get("preferences/focus-mode")
  getFocusMode(@CurrentUser() userId: string) {
    return this.listenerExp.getFocusMode(userId);
  }

  @Put("preferences/focus-mode")
  setFocusMode(@CurrentUser() userId: string, @Body("enabled") enabled: boolean) {
    return this.listenerExp.setFocusMode(userId, enabled);
  }

  @Get("preferences/read-mode")
  getReadMode(@CurrentUser() userId: string) {
    return this.listenerExp.getReadMode(userId);
  }

  @Put("preferences/read-mode")
  setReadMode(@CurrentUser() userId: string, @Body("enabled") enabled: boolean) {
    return this.listenerExp.setReadMode(userId, enabled);
  }

  // ─── F-511–512: Countdown & Fortschritt ─────────────────────────────────

  @Get(":id/countdown")
  getActiveLoanCountdown(@Param("id") id: string) {
    return this.listenerExp.getActiveLoanCountdown(id);
  }

  @Get("progress/:workId")
  getWorkListeningProgress(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getWorkListeningProgress(userId, workId);
  }

  // ─── F-513–514: Transcript-Reaktionen & Szenen-Marker ──────────────────

  @Get("reactions/:workId")
  getTranscriptReactions(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getTranscriptReactions(userId, workId);
  }

  @Post("reactions/:workId")
  addTranscriptReaction(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("positionSeconds") positionSeconds: number,
    @Body("emoji") emoji: string,
  ) {
    return this.listenerExp.addTranscriptReaction(userId, workId, positionSeconds, emoji);
  }

  @Get("scene-markers/:workId")
  getSceneMarkers(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getSceneMarkers(userId, workId);
  }

  @Post("scene-markers/:workId")
  addSceneMarker(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("positionSeconds") positionSeconds: number,
    @Body("label") label: string,
    @Body("isPublic") isPublic: boolean,
  ) {
    return this.listenerExp.addSceneMarker(userId, workId, positionSeconds, label, isPublic);
  }

  // ─── F-515–518: Social Listening ────────────────────────────────────────

  @Get("social/current-listeners/:workId")
  getCurrentListeners(@Param("workId") workId: string) {
    return this.listenerExp.getCurrentListeners(workId);
  }

  @Post("social/group-session")
  createGroupListeningSession(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("invitedUserIds") invitedUserIds: string[],
  ) {
    return this.listenerExp.createGroupListeningSession(userId, workId, invitedUserIds);
  }

  @Get("social/group-session/:sessionId")
  getGroupListeningSession(@Param("sessionId") sessionId: string) {
    return this.listenerExp.getGroupListeningSession(sessionId);
  }

  @Get("social/party-chat/:sessionId")
  getListeningPartyChat(@Param("sessionId") sessionId: string) {
    return this.listenerExp.getListeningPartyChat(sessionId);
  }

  @Post("social/party-chat/:sessionId")
  sendListeningPartyMessage(
    @CurrentUser() userId: string,
    @Param("sessionId") sessionId: string,
    @Body("text") text: string,
  ) {
    return this.listenerExp.sendListeningPartyMessage(sessionId, userId, text);
  }

  @Get("preferences/reactions-overlay")
  getReactionsOverlayConfig(@CurrentUser() userId: string) {
    return this.listenerExp.getReactionsOverlayConfig(userId);
  }

  @Put("preferences/reactions-overlay")
  setReactionsOverlayConfig(@CurrentUser() userId: string, @Body() config: Record<string, unknown>) {
    return this.listenerExp.setReactionsOverlayConfig(userId, config);
  }

  // ─── F-519–534: Bewertungen & Reviews ──────────────────────────────────

  @Get("rating-prompt/:workId")
  checkRatingPrompt(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.checkRatingPrompt(userId, workId);
  }

  @Post("ratings/:workId")
  createOrUpdateRating(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("value") value: number,
  ) {
    return this.listenerExp.createOrUpdateRating(userId, workId, value);
  }

  @Post("reviews/:workId")
  createOrUpdateReview(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("body") body: string,
    @Body("rating") rating: number,
    @Body("hasSpoiler") hasSpoiler: boolean,
  ) {
    return this.listenerExp.createOrUpdateReview(userId, workId, body, rating, hasSpoiler);
  }

  @Post("reviews/:reviewId/vote")
  voteReviewHelpful(
    @CurrentUser() userId: string,
    @Param("reviewId") reviewId: string,
    @Body("helpful") helpful: boolean,
  ) {
    return this.listenerExp.voteReviewHelpful(userId, reviewId, helpful);
  }

  @Get("reviews/:reviewId/spoiler")
  getReviewSpoilerFlag(@Param("reviewId") reviewId: string) {
    return this.listenerExp.getReviewSpoilerFlag(reviewId);
  }

  @Get("review-history")
  getUserReviewHistory(@CurrentUser() userId: string) {
    return this.listenerExp.getUserReviewHistory(userId);
  }

  @Get("reviews/:reviewId/comments")
  getReviewComments(@Param("reviewId") reviewId: string) {
    return this.listenerExp.getReviewComments(reviewId);
  }

  @Post("reviews/:reviewId/comments")
  addReviewComment(
    @CurrentUser() userId: string,
    @Param("reviewId") reviewId: string,
    @Body("text") text: string,
  ) {
    return this.listenerExp.addReviewComment(reviewId, userId, text);
  }

  @Get("work-reviews/:workId")
  getReviews(
    @Param("workId") workId: string,
    @Query("sort") sort: string,
    @Query("verifiedOnly") verifiedOnly: string,
  ) {
    return this.listenerExp.getReviews(workId, sort, verifiedOnly === 'true');
  }

  @Post("ratings/:workId/detailed")
  createDetailedRating(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body() criteria: Record<string, number>,
  ) {
    return this.listenerExp.createDetailedRating(userId, workId, criteria);
  }

  @Get("ratings/:workId/detailed")
  getDetailedRatings(@Param("workId") workId: string) {
    return this.listenerExp.getDetailedRatings(workId);
  }

  @Get("reviews/:workId/word-cloud")
  getReviewWordCloud(@Param("workId") workId: string) {
    return this.listenerExp.getReviewWordCloud(workId);
  }

  @Get("reviews/:workId/sentiment")
  getReviewSentiment(@Param("workId") workId: string) {
    return this.listenerExp.getReviewSentimentAnalysis(workId);
  }

  @Get("reviews/:workId/ai-summary")
  getReviewAiSummary(@Param("workId") workId: string) {
    return this.listenerExp.getReviewAiSummary(workId);
  }

  // ─── F-535–540: Personalisierung ────────────────────────────────────────

  @Get("preferences/interest-tags")
  getInterestTags(@CurrentUser() userId: string) {
    return this.listenerExp.getInterestTags(userId);
  }

  @Put("preferences/interest-tags")
  setInterestTags(@CurrentUser() userId: string, @Body("tags") tags: string[]) {
    return this.listenerExp.setInterestTags(userId, tags);
  }

  @Post("recommendations/:workId/dismiss")
  dismissRecommendation(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.dismissRecommendation(userId, workId);
  }

  @Post("recommendations/:workId/more-like-this")
  markMoreLikeThis(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.markMoreLikeThis(userId, workId);
  }

  @Post("mood-vote/:workId")
  submitMoodRating(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("mood") mood: string,
  ) {
    return this.listenerExp.submitMoodRating(userId, workId, mood);
  }

  @Post("inactivity-feedback")
  submitInactivityFeedback(@CurrentUser() userId: string, @Body("feedback") feedback: string) {
    return this.listenerExp.submitInactivityFeedback(userId, feedback);
  }

  // ─── F-541–543: Barrierefreiheit ────────────────────────────────────────

  @Get("player/keyboard-config")
  getPlayerKeyboardConfig() {
    return this.listenerExp.getPlayerKeyboardConfig();
  }

  @Get("player/aria-config")
  getAriaConfig() {
    return this.listenerExp.getAriaConfig();
  }

  // ─── F-544–547: Onboarding ──────────────────────────────────────────────

  @Get("onboarding/tooltips")
  getTooltipConfig(@CurrentUser() userId: string) {
    return this.listenerExp.getTooltipConfig(userId);
  }

  @Post("onboarding/tooltips/:tooltipId/seen")
  markTooltipSeen(@CurrentUser() userId: string, @Param("tooltipId") tooltipId: string) {
    return this.listenerExp.markTooltipSeen(userId, tooltipId);
  }

  @Get("onboarding/status")
  getOnboardingStatus(@CurrentUser() userId: string) {
    return this.listenerExp.getOnboardingStatus(userId);
  }

  @Post("onboarding/steps/:step/complete")
  completeOnboardingStep(@CurrentUser() userId: string, @Param("step") step: string) {
    return this.listenerExp.completeOnboardingStep(userId, step);
  }

  @Get("onboarding/tour")
  getGuidedTourStatus(@CurrentUser() userId: string) {
    return this.listenerExp.getGuidedTourStatus(userId);
  }

  @Post("onboarding/tour/complete")
  completeGuidedTour(@CurrentUser() userId: string) {
    return this.listenerExp.completeGuidedTour(userId);
  }

  // ─── F-548–557: Gamification & Statistiken ──────────────────────────────

  @Get("gamification/skill-progress")
  getSkillProgress(@CurrentUser() userId: string) {
    return this.listenerExp.getSkillProgress(userId);
  }

  @Get("gamification/listener-of-month")
  getListenerOfMonth(@Query("period") period: string) {
    return this.listenerExp.getListenerOfMonth(period);
  }

  @Get("gamification/monthly-challenge")
  getMonthlyChallenge(@CurrentUser() userId: string) {
    return this.listenerExp.getMonthlyChallenge(userId);
  }

  @Put("gamification/monthly-goal")
  setMonthlyGoal(
    @CurrentUser() userId: string,
    @Body("targetWorks") targetWorks: number,
    @Body("period") period: string,
  ) {
    return this.listenerExp.setMonthlyGoal(userId, targetWorks, period);
  }

  @Post("gamification/challenge-friend")
  challengeFriend(
    @CurrentUser() userId: string,
    @Body("friendId") friendId: string,
    @Body("targetCount") targetCount: number,
    @Body("period") period: string,
  ) {
    return this.listenerExp.challengeFriend(userId, friendId, targetCount, period);
  }

  @Get("stats/yearly")
  getYearlyStats(@CurrentUser() userId: string, @Query("year") year: string) {
    return this.listenerExp.getYearlyStats(userId, parseInt(year, 10) || new Date().getFullYear());
  }

  @Get("stats/yearly/poster")
  getYearlyStatsPoster(@CurrentUser() userId: string, @Query("year") year: string) {
    return this.listenerExp.getYearlyStatsPoster(userId, parseInt(year, 10) || new Date().getFullYear());
  }

  @Get("stats/hour-equivalent")
  getHourEquivalent(@CurrentUser() userId: string) {
    return this.listenerExp.getHourEquivalent(userId);
  }

  @Post("quotes/:loanId")
  createQuote(
    @CurrentUser() userId: string,
    @Param("loanId") loanId: string,
    @Body("text") text: string,
    @Body("positionSeconds") positionSeconds: number,
  ) {
    return this.listenerExp.createQuote(userId, loanId, text, positionSeconds);
  }

  @Get("quotes")
  getQuotes(@CurrentUser() userId: string) {
    return this.listenerExp.getQuotes(userId);
  }

  @Get("quotes/:quoteId/card")
  createQuoteCard(@CurrentUser() userId: string, @Param("quoteId") quoteId: string) {
    return this.listenerExp.createQuoteCard(userId, quoteId);
  }

  // ─── F-558–570: Lernen & Sprachfunktionen ───────────────────────────────

  @Get("vocab/:workId")
  getVocabList(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getVocabList(userId, workId);
  }

  @Post("vocab/:workId")
  addVocabItem(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("term") term: string,
    @Body("definition") definition: string,
  ) {
    return this.listenerExp.addVocabItem(userId, workId, term, definition);
  }

  @Get("flashcards/:workId")
  getFlashcards(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getFlashcards(userId, workId);
  }

  @Get("anki-export/:workId")
  getAnkiExportUrl(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getAnkiExportUrl(userId, workId);
  }

  @Get("sync-mode/:workId")
  getSyncModeConfig(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getSyncModeConfig(userId, workId);
  }

  @Put("sync-mode/:workId")
  setSyncModeConfig(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body() config: Record<string, unknown>,
  ) {
    return this.listenerExp.setSyncModeConfig(userId, workId, config);
  }

  @Get("companion-materials/:workId")
  getCompanionMaterials(@Param("workId") workId: string) {
    return this.listenerExp.getCompanionMaterials(workId);
  }

  @Get("wikipedia/:workId")
  getWikipediaContext(@Param("workId") workId: string) {
    return this.listenerExp.getWikipediaContext(workId);
  }

  @Get("similar-nonfiction/:workId")
  getSimilarNonFiction(@Param("workId") workId: string) {
    return this.listenerExp.getSimilarNonFictionWorks(workId);
  }

  @Get("tempo/:loanId")
  getTempoTracking(@CurrentUser() userId: string, @Param("loanId") loanId: string) {
    return this.listenerExp.getTempoTracking(userId, loanId);
  }

  @Post("tempo/:loanId")
  recordTempoEvent(@Param("loanId") loanId: string, @Body("speed") speed: number) {
    return this.listenerExp.recordTempoEvent(loanId, speed);
  }

  @Get("focus-score/:loanId")
  getFocusScore(@CurrentUser() userId: string, @Param("loanId") loanId: string) {
    return this.listenerExp.getFocusScore(userId, loanId);
  }

  @Get("learning-goal/:workId")
  getLearningGoal(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.listenerExp.getLearningGoal(userId, workId);
  }

  @Put("learning-goal/:workId")
  setLearningGoal(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body() goal: Record<string, unknown>,
  ) {
    return this.listenerExp.setLearningGoal(userId, workId, goal);
  }

  @Get("mindmap/:workId")
  getMindmap(@Param("workId") workId: string) {
    return this.listenerExp.getMindmap(workId);
  }
}
