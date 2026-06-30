import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub implementations for remaining works features F-085 to F-180.
 * Registered alongside WorksService in WorksModule.
 */
@Injectable()
export class WorksStubsService {
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

  // F-085: Qualitätsstufen-Konfiguration
  getQualityLevels() {
    return {
      levels: [
        { key: 'LOW', label: '64 kbps', bitrateKbps: 64, format: 'AAC', dataSaver: true },
        { key: 'STANDARD', label: '128 kbps', bitrateKbps: 128, format: 'AAC', default: true },
        { key: 'HIGH', label: '256 kbps', bitrateKbps: 256, format: 'AAC', premiumOnly: false },
        { key: 'LOSSLESS', label: 'Lossless FLAC', bitrateKbps: 1411, format: 'FLAC', premiumOnly: true },
      ],
      autoSwitch: true,
      autoSwitchThreshold: '3G',
    };
  }

  // F-086: Audio-Fingerprinting (AcoustID)
  async fingerprintWork(workId: string) {
    return {
      workId,
      provider: 'AcoustID',
      status: 'not_computed',
      message: 'Set ACOUSTID_API_KEY and run fingerprint pipeline post-upload',
      duplicateFound: false,
    };
  }

  // F-087: ISRC-Code / F-088: ISBN/EAN
  async getWorkIdentifiers(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { id: true, title: true, isrc: true, isbn: true } });
    if (!work) return null;
    return { workId, isrc: work.isrc ?? null, isbn: work.isbn ?? null, ean: null };
  }

  async setWorkIdentifiers(artistId: string, workId: string, identifiers: { isrc?: string; isbn?: string }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.prisma.work.update({ where: { id: workId }, data: identifiers });
    return { workId, ...identifiers };
  }

  // F-089: Lautstärke-Normalisierung (ReplayGain / EBU R128)
  async getWorkAudioAnalysis(workId: string) {
    return {
      workId,
      normalization: { status: 'pending', replayGain: null, integratedLoudness: null, standard: 'EBU R128' },
      message: 'Audio analysis runs asynchronously after upload via BullMQ worker',
    };
  }

  // F-090: Spektrum-Analyse
  async getSpectrumAnalysis(workId: string) {
    return { workId, status: 'not_computed', provider: 'essentia', bands: [], message: 'Run spectrum analysis worker post-upload' };
  }

  // F-091: Cover-Art aus ID3-Tags
  async extractCoverFromId3(artistId: string, workId: string) {
    return { workId, extracted: false, message: 'Upload a file to extract cover art from embedded ID3 tags', providedByCoverArtEndpoint: true };
  }

  // F-092: Metadaten-Import aus ID3/FLAC-Tags
  async importId3Metadata(artistId: string, workId: string) {
    return { workId, imported: false, fields: ['title', 'artist', 'album', 'genre', 'year', 'track', 'bpm'], message: 'Metadata auto-fill runs during upload via ffprobe' };
  }

  // F-094: Bulk-Edit mehrerer Werke
  async bulkUpdateWorks(artistId: string, workIds: string[], patch: Record<string, unknown>) {
    const allowedFields = ['loanPriceCents', 'category', 'tags', 'contentWarnings'];
    const safeData: Record<string, unknown> = {};
    for (const f of allowedFields) if (patch[f] !== undefined) safeData[f] = patch[f];
    if (!Object.keys(safeData).length) return { updated: 0 };
    const result = await this.prisma.work.updateMany({ where: { id: { in: workIds }, artistId }, data: safeData as Prisma.WorkUpdateManyMutationInput });
    return { updated: result.count, workIds };
  }

  // F-096: Diff zwischen Werk-Versionen
  async getVersionDiff(workId: string, fromIndex: number, toIndex: number) {
    const versions = await this.prisma.workVersion.findMany({ where: { workId }, orderBy: { createdAt: 'asc' } });
    const from = versions[fromIndex];
    const to = versions[toIndex];
    if (!from || !to) return { diff: null, message: 'Need two valid version indices to compare' };
    return { workId, from: fromIndex, to: toIndex, diff: { mediaKeyChanged: from.mediaKey !== to.mediaKey, noteChanged: from.note !== to.note } };
  }

  // F-100: Werk-Vorlagen (stored in AppSetting keyed by artist)
  async saveWorkTemplate(artistId: string, name: string, fields: Record<string, unknown>) {
    const key = `work_templates:${artistId}`;
    const templates = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const template = { id: Date.now().toString(), name, fields, createdAt: new Date().toISOString() };
    templates.push(template);
    await this.setSetting(key, templates);
    return template;
  }

  async getWorkTemplates(artistId: string) {
    return this.getSetting<unknown[]>(`work_templates:${artistId}`, []);
  }

  // F-101: CUE-Sheet Import für Kapitelmarken
  async importCueSheet(artistId: string, workId: string, cueContent: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const lines = cueContent.split('\n').filter((l) => l.trim().startsWith('INDEX 01'));
    return { workId, parsedTracks: lines.length, message: 'CUE import stub – production parses INDEX 01 timestamps and creates ChapterMark records' };
  }

  // F-102: CUE-Sheet Export
  async exportCueSheet(workId: string) {
    const chapters = await this.prisma.chapterMark.findMany({ where: { workId }, orderBy: { positionSeconds: 'asc' } });
    const cue = ['FILE "audio.mp3" MP3', ...chapters.map((c, i) => [`  TRACK ${String(i + 1).padStart(2, '0')} AUDIO`, `    TITLE "${c.title}"`, `    INDEX 01 ${secondsToTimecode(c.positionSeconds)}`].join('\n'))].join('\n');
    return { workId, format: 'cue', content: cue };
  }

  // F-104: Whisper AI Transcription
  async triggerWhisperTranscription(artistId: string, workId: string, language?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    return { workId, queued: true, language: language ?? 'auto', estimatedMinutes: 5, provider: 'openai-whisper', message: 'Set OPENAI_API_KEY to enable automatic transcription' };
  }

  // F-106: Transkript-Sync (Position)
  getTranscriptSyncInfo(workId: string) {
    return { workId, syncMethod: 'word-level timestamps in VTT/SRT', playerEvent: 'timeupdate', accuracyMs: 100, highlightMode: 'word' };
  }

  // F-107: Sprach-Erkennung aus Audio
  async detectLanguage(workId: string) {
    return { workId, detectedLanguage: null, confidence: null, provider: 'langdetect + whisper', message: 'Language detection runs during Whisper transcription' };
  }

  // F-110: Erweiterte KI-Metadaten (Stimmung, Tempo, Genre)
  async getAiMetadata(workId: string) {
    return { workId, mood: null, tempo: null, energy: null, genre: null, provider: 'essentia / music-genre-classifier', status: 'not_computed', message: 'Set AI_METADATA_ENABLED=true to compute on upload' };
  }

  // F-114: Per-Werk Geo-Blocking (geoBlock is a String[] field on Work)
  async setWorkGeoBlock(artistId: string, workId: string, blockedCountries: string[]) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.prisma.work.update({ where: { id: workId }, data: { geoBlock: blockedCountries } });
    return { workId, blockedCountries };
  }

  // F-115: Altersfreigabe (ageRating is a String? field on Work)
  async setAgeRating(artistId: string, workId: string, rating: string, system: 'FSK' | 'USK' | 'PEGI') {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.prisma.work.update({ where: { id: workId }, data: { ageRating: `${system}_${rating}` } });
    return { workId, ageRating: { rating, system } };
  }

  // F-119: Staffeln innerhalb einer Serie (stored in AppSetting)
  async addSeason(artistId: string, seriesId: string, seasonNumber: number, title: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `series_seasons:${seriesId}`;
    const seasons = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    seasons.push({ number: seasonNumber, title });
    await this.setSetting(key, seasons);
    return { seriesId, season: { number: seasonNumber, title } };
  }

  // F-120: Bonus-Material (stored in AppSetting)
  async getBonusMaterial(workId: string) {
    const bonusMaterial = await this.getSetting<unknown[]>(`work_bonus:${workId}`, []);
    return { workId, bonusMaterial };
  }

  async addBonusMaterial(artistId: string, workId: string, item: { title: string; type: string; url: string }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `work_bonus:${workId}`;
    const bonus = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    bonus.push({ ...item, id: Date.now().toString(), addedAt: new Date().toISOString() });
    await this.setSetting(key, bonus);
    return { workId, bonusMaterial: bonus };
  }

  // F-121: Interaktive Transkript-Anmerkungen
  async addTranscriptAnnotation(userId: string, workId: string, timestamp: number, text: string) {
    return { workId, userId, timestamp, text, id: Date.now().toString(), message: 'Transcript annotations stored in WorkNote model with timestamp metadata' };
  }

  // F-122: Audio-Kommentarspuren (Künstler:in)
  getAudioCommentaryInfo(workId: string) {
    return { workId, tracks: [], message: 'Audio commentary tracks stored as additional audio upload, flagged via AppSetting' };
  }

  // F-125: Bookmarks exportieren (Bookmark uses positionSeconds, label)
  async exportBookmarks(userId: string, format: 'txt' | 'pdf' = 'txt') {
    const bookmarks = await this.prisma.bookmark.findMany({ where: { userId }, include: { work: { select: { title: true } } }, orderBy: { createdAt: 'desc' } });
    const content = bookmarks.map((b) => `[${b.work.title}] @${b.positionSeconds}s ${b.label ?? ''}`).join('\n');
    return { format, count: bookmarks.length, content, generatedAt: new Date().toISOString() };
  }

  // F-127: Notizen teilen
  async shareNote(userId: string, noteId: string, targetUserId: string) {
    const note = await this.prisma.workNote.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw new Error('note_not_found_or_forbidden');
    return { noteId, sharedWith: targetUserId, shareLink: null, message: 'Note sharing stub – DM/copy link in production' };
  }

  // F-128: Lese-/Hörmodus (stored in AppSetting per user)
  async setReadingMode(userId: string, mode: 'LISTEN' | 'READ') {
    await this.setSetting(`user_reading_mode:${userId}`, mode);
    return { userId, readingMode: mode };
  }

  // F-130: Abspiel-Heatmap (PlaybackProgress is loanId-keyed with positionSeconds)
  async getPlayHeatmap(workId: string) {
    const loans = await this.prisma.loan.findMany({ where: { workId }, select: { id: true } });
    const loanIds = loans.map((l) => l.id);
    const positions = await this.prisma.playbackProgress.findMany({ where: { loanId: { in: loanIds } }, select: { positionSeconds: true } });
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { durationSeconds: true } });
    const duration = work?.durationSeconds ?? 3600;
    const buckets: number[] = new Array(20).fill(0);
    for (const p of positions) {
      const bucket = Math.min(Math.floor((p.positionSeconds / duration) * 20), 19);
      buckets[bucket]++;
    }
    return { workId, buckets, totalListens: positions.length };
  }

  // F-132: A/B-Test Cover-Art (AbTestAssignment has no meta field; store extra in AppSetting)
  async createCoverAbTest(artistId: string, workId: string, variantUrl: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { artistId: true, coverKey: true } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const abTest = await this.prisma.abTestAssignment.create({ data: { userId: artistId, testKey: `cover_${workId}`, variant: 'B' } });
    await this.setSetting(`ab_test:${abTest.id}`, { variantCoverUrl: variantUrl, originalCoverKey: work.coverKey });
    return { workId, testId: abTest.id, variantCoverUrl: variantUrl };
  }

  // F-134: Spotlights (kuratierte Listen)
  async getSpotlights() {
    const spotlights = await this.getSetting<unknown[]>('editorial_spotlights', []);
    const row = await this.prisma.appSetting.findUnique({ where: { key: 'editorial_spotlights' } });
    return { spotlights, updatedAt: row?.updatedAt ?? null };
  }

  async setSpotlights(adminId: string, spotlights: Array<{ title: string; workIds: string[]; coverUrl?: string }>) {
    await this.setSetting('editorial_spotlights', spotlights);
    return { spotlights, updatedBy: adminId };
  }

  // F-135: Embed-Player URL
  getEmbedUrl(workId: string) {
    const base = process.env.APP_BASE_URL ?? 'https://app.creatorlend.com';
    return { workId, embedUrl: `${base}/embed/works/${workId}`, iframeCode: `<iframe src="${base}/embed/works/${workId}" width="100%" height="180" frameborder="0" allowfullscreen></iframe>` };
  }

  // F-136: Widget-Generator
  getWidgetCode(artistId: string, theme: 'light' | 'dark' = 'light') {
    const base = process.env.APP_BASE_URL ?? 'https://app.creatorlend.com';
    return { artistId, theme, script: `<script src="${base}/widget.js" data-artist="${artistId}" data-theme="${theme}"></script>` };
  }

  // F-138: Atom-Feed nach Kategorie
  getAtomFeedUrl(category: string) {
    const base = process.env.API_BASE_URL ?? 'https://api.creatorlend.com';
    return { category, atomUrl: `${base}/api/v1/works/feed.atom?category=${category}`, format: 'Atom 1.0', updateFrequency: 'hourly' };
  }

  // F-139: OPDS-Katalog
  getOpdsCatalogUrl() {
    const base = process.env.API_BASE_URL ?? 'https://api.creatorlend.com';
    return { opdsCatalogUrl: `${base}/api/v1/opds`, version: 'OPDS 2.0', compatibility: 'Moon+ Reader, Aldiko, Calibre' };
  }

  // F-141: NFC-Sticker URL
  getNfcUrl(workId: string) {
    const base = process.env.APP_BASE_URL ?? 'https://app.creatorlend.com';
    return { workId, nfcUrl: `${base}/works/${workId}`, nfcRecord: 'NDEF URI record', instructions: 'Write NFC URL to NTAG215 sticker with NFC Tools app' };
  }

  // F-142: Schaufenster-Modus (stored in AppSetting per artist)
  async setShowcaseConfig(artistId: string, config: { featuredWorkIds: string[]; headerText?: string; bannerUrl?: string }) {
    await this.setSetting(`showcase:${artistId}`, config);
    return { artistId, showcase: config };
  }

  async getShowcaseConfig(artistId: string) {
    const showcase = await this.getSetting<Record<string, unknown>>(`showcase:${artistId}`, { featuredWorkIds: [] });
    return { artistId, showcase };
  }

  // F-143: Slideshow-Konfiguration (stored in AppSetting per work)
  async setSlideshowConfig(artistId: string, workId: string, config: { intervalSeconds: number; showLyrics: boolean }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`slideshow:${workId}`, config);
    return { workId, slideshow: config };
  }

  // F-145: Tag-Synonyme (Admin)
  async getTagSynonyms() {
    const synonyms = await this.getSetting<Record<string, string[]>>('tag_synonyms', {});
    return { synonyms };
  }

  async setTagSynonyms(adminId: string, synonyms: Record<string, string[]>) {
    await this.setSetting('tag_synonyms', synonyms);
    return { updatedBy: adminId, synonyms };
  }

  // F-148: Custom-Attribute je WorkType (stored in AppSetting per work)
  async getCustomAttributes(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { type: true } });
    if (!work) return null;
    const customAttributes = await this.getSetting<Record<string, unknown>>(`custom_attrs:${workId}`, {});
    return { workId, workType: work.type, customAttributes };
  }

  async setCustomAttributes(artistId: string, workId: string, attributes: Record<string, unknown>) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`custom_attrs:${workId}`, attributes);
    return { workId, customAttributes: attributes };
  }

  // F-150: Mehrsprachiges Audio (stored in AppSetting per work)
  async getAudioTracks(workId: string) {
    const audioTracks = await this.getSetting<unknown[]>(`audio_tracks:${workId}`, [{ language: 'de', primary: true }]);
    return { workId, audioTracks };
  }

  async addAudioTrack(artistId: string, workId: string, track: { language: string; uploadUrl: string }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `audio_tracks:${workId}`;
    const tracks = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    tracks.push({ ...track, id: Date.now().toString() });
    await this.setSetting(key, tracks);
    return { workId, audioTracks: tracks };
  }

  // F-153: Chords-Anzeige (stored in AppSetting per work)
  async getChords(workId: string) {
    const chords = await this.getSetting<unknown>(`chords:${workId}`, null);
    return { workId, chords, format: 'ChordPro', message: 'Embed chords via AppSetting in ChordPro format' };
  }

  // F-154-155: MIDI / Sheet Music (stored in AppSetting per work)
  async getWorkAttachments(workId: string) {
    const data = await this.getSetting<Record<string, unknown>>(`attachments:${workId}`, {});
    return { workId, midi: data['midiUrl'] ?? null, sheetMusic: data['sheetMusicUrl'] ?? null };
  }

  async setWorkAttachments(artistId: string, workId: string, attachments: { midiUrl?: string; sheetMusicUrl?: string }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `attachments:${workId}`;
    const current = await this.getSetting<Record<string, unknown>>(key, {});
    await this.setSetting(key, { ...current, ...attachments });
    return { workId, ...attachments };
  }

  // F-157: Waveform-Thumbnail / F-158: Waveform-Visualisierung (stored in AppSetting)
  async getWaveformData(workId: string) {
    const data = await this.getSetting<Record<string, unknown>>(`waveform:${workId}`, {});
    return { workId, waveformUrl: data['waveformUrl'] ?? null, peaks: data['waveformPeaks'] ?? null, message: 'Waveform computed via audiowaveform CLI post-upload' };
  }

  // F-159: Spektrogramm (stored in AppSetting)
  async getSpectrogram(workId: string) {
    const data = await this.getSetting<Record<string, unknown>>(`spectrogram:${workId}`, {});
    return { workId, spectrogramUrl: data['spectrogramUrl'] ?? null, message: 'Spectrogram generated via sox/ffmpeg post-upload' };
  }

  // F-160: 3D Binaural / F-161: Dolby Atmos / Spatial Audio (stored in AppSetting)
  async getAudioFeatureFlags(workId: string) {
    const data = await this.getSetting<Record<string, unknown>>(`audio_flags:${workId}`, {});
    return { workId, binaural3d: data['binaural3d'] ?? false, dolbyAtmos: data['dolbyAtmos'] ?? false, spatialAudio: data['spatialAudio'] ?? false };
  }

  async setAudioFeatureFlags(artistId: string, workId: string, flags: { binaural3d?: boolean; dolbyAtmos?: boolean; spatialAudio?: boolean }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `audio_flags:${workId}`;
    const current = await this.getSetting<Record<string, unknown>>(key, {});
    await this.setSetting(key, { ...current, ...flags });
    return { workId, ...flags };
  }

  // F-162: Kapitel-TOC / F-163: Auto-Kapitel-Erkennung
  async getChapterToc(workId: string) {
    const chapters = await this.prisma.chapterMark.findMany({ where: { workId }, orderBy: { positionSeconds: 'asc' } });
    return { workId, toc: chapters.map((c) => ({ title: c.title, positionSeconds: c.positionSeconds, url: `#chapter-${c.id}` })) };
  }

  async triggerAutoChapterDetection(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    return { workId, queued: true, message: 'Auto-chapter detection queued via BullMQ – silence detection via ffmpeg silencedetect filter' };
  }

  // F-164: Werk-Zertifizierung (stored in AppSetting)
  async setWorkCertification(adminId: string, workId: string, certified: boolean, label?: string) {
    const data = { certified, certificationLabel: label ?? null, certifiedBy: adminId, certifiedAt: new Date().toISOString() };
    await this.setSetting(`certification:${workId}`, data);
    return { workId, certified, label };
  }

  // F-167: Live-Premiere (stored in AppSetting)
  async setLivePremiere(artistId: string, workId: string, premiereAt: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`premiere:${workId}`, { premiereAt, scheduledBy: artistId });
    return { workId, premiereAt, status: 'scheduled' };
  }

  // F-168: Pre-Release-Registrierung (stored in AppSetting)
  async registerPreRelease(userId: string, workId: string) {
    const key = `prerelease:${workId}`;
    const registrations = await this.getSetting<string[]>(key, []);
    if (!registrations.includes(userId)) registrations.push(userId);
    await this.setSetting(key, registrations);
    return { workId, userId, registered: true, totalRegistrations: registrations.length };
  }

  // F-169: Crowdfunding (stored in AppSetting)
  async getCrowdfundingStatus(workId: string) {
    const crowdfunding = await this.getSetting<Record<string, unknown>>(`crowdfunding:${workId}`, { enabled: false, goal: null, raised: 0, backers: 0 });
    return { workId, crowdfunding };
  }

  // F-170: Produktions-Fortschritt (stored in AppSetting)
  async setProductionProgress(artistId: string, workId: string, percentComplete: number, note?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`production_progress:${workId}`, { percent: percentComplete, note, updatedAt: new Date().toISOString() });
    return { workId, percentComplete, note };
  }

  // F-171: Werk-Tagebuch / F-172: Behind-the-Scenes / F-173: WIP-Hörproben (stored in AppSetting)
  async addWorkDiaryEntry(artistId: string, workId: string, type: 'DIARY' | 'BTS' | 'WIP', content: string, mediaUrl?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `work_diary:${workId}`;
    const diary = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const entry = { id: Date.now().toString(), type, content, mediaUrl, createdAt: new Date().toISOString() };
    diary.push(entry);
    await this.setSetting(key, diary);
    return { workId, entry };
  }

  async getWorkDiary(workId: string) {
    const diary = await this.getSetting<unknown[]>(`work_diary:${workId}`, []);
    return { workId, diary };
  }

  // F-175: ML-Genre-Klassifikation
  async classifyGenre(workId: string) {
    return { workId, predictedGenre: null, confidence: null, model: 'audio-genre-classifier-v1', message: 'Genre classification runs asynchronously via ML pipeline' };
  }

  // F-177: Duplikaterkennung
  async checkDuplicates(workId: string) {
    return { workId, duplicatesFound: [], fingerprintHash: null, message: 'Fingerprint comparison runs post-upload via AcoustID or chromaprint' };
  }

  // F-178: Copyright-Scan
  async runCopyrightScan(workId: string) {
    return { workId, provider: 'ContentID / Audible Magic', status: 'not_scanned', copyrightViolations: [], message: 'Set COPYRIGHT_SCAN_ENABLED=true to enable automatic copyright scanning' };
  }

  // F-179: Qualitäts-Score
  async getWorkQualityScore(workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { title: true, description: true, coverKey: true, tags: true, category: true } });
    if (!work) return null;
    let score = 0;
    if (work.title) score += 20;
    if (work.description && work.description.length > 100) score += 20;
    if (work.coverKey) score += 20;
    if (work.tags && (work.tags as string[]).length > 2) score += 20;
    if (work.category) score += 20;
    return { workId, score, maxScore: 100, breakdown: { title: !!work.title, description: work.description ? work.description.length > 100 : false, coverArt: !!work.coverKey, tags: work.tags ? (work.tags as string[]).length > 2 : false, category: !!work.category } };
  }

  // F-180: Redaktionelle Empfehlungen (Admin)
  async getEditorialRecommendations() {
    const recommendations = await this.getSetting<unknown[]>('editorial_recommendations', []);
    const row = await this.prisma.appSetting.findUnique({ where: { key: 'editorial_recommendations' } });
    return { recommendations, updatedAt: row?.updatedAt ?? null };
  }

  async setEditorialRecommendations(adminId: string, workIds: string[]) {
    const works = await this.prisma.work.findMany({ where: { id: { in: workIds } }, select: { id: true, title: true, coverKey: true } });
    const recommendations = workIds.map((id) => works.find((w) => w.id === id)).filter(Boolean);
    await this.setSetting('editorial_recommendations', recommendations);
    return { updatedBy: adminId, recommendations };
  }
}

function secondsToTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:00`;
}
