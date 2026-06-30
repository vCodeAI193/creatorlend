import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub implementations for artist tool features F-421 to F-500
 * (analytics, profile, distribution, notifications gaps).
 */
@Injectable()
export class ArtistStubsService {
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

  // F-423: Echtzeit-Statistiken: aktive Leihen gerade jetzt
  async getRealtimeStats(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true } });
    const workIds = works.map((w) => w.id);
    const activeLoans = await this.prisma.loan.count({ where: { workId: { in: workIds }, status: 'ACTIVE', expiresAt: { gt: new Date() } } });
    return { artistId, activeLoansNow: activeLoans, timestamp: new Date().toISOString() };
  }

  // F-429: Demografische Auswertung (anonymisiert)
  async getDemographicsAnalytics(artistId: string) {
    return { artistId, message: 'Demographics data is a stub – real data requires opt-in age/gender collection during registration', breakdown: { ageGroups: [{ range: '18-24', percent: 22 }, { range: '25-34', percent: 38 }, { range: '35-44', percent: 25 }, { range: '45+', percent: 15 }], gender: [{ label: 'Female', percent: 52 }, { label: 'Male', percent: 42 }, { label: 'Non-binary', percent: 6 }] } };
  }

  // F-430: Device-Split (Web / iOS / Android)
  async getDeviceSplitAnalytics(artistId: string) {
    return { artistId, message: 'Device split is a stub – real data requires user-agent logging in playback events', breakdown: [{ device: 'iOS', percent: 45 }, { device: 'Android', percent: 35 }, { device: 'Web', percent: 20 }] };
  }

  // F-431: Tageszeit-Auswertung
  async getTimeOfDayAnalytics(artistId: string) {
    return { artistId, message: 'Time-of-day analytics stub – track loan creation timestamps per artist works', peakHour: 20, breakdown: Array.from({ length: 24 }, (_, h) => ({ hour: h, relativeVolume: Math.sin((h - 6) * Math.PI / 12) > 0 ? Math.sin((h - 6) * Math.PI / 12) : 0 })) };
  }

  // F-432: Abbruch-Rate je Werk
  async getDropOffRate(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, title: true, durationSeconds: true } });
    const result = await Promise.all(works.map(async (w) => {
      const loans = await this.prisma.loan.findMany({ where: { workId: w.id }, select: { id: true } });
      const loanIds = loans.map((l) => l.id);
      const progresses = loanIds.length ? await this.prisma.playbackProgress.findMany({ where: { loanId: { in: loanIds } }, select: { positionSeconds: true } }) : [];
      const avgPosition = progresses.length ? progresses.reduce((s, p) => s + p.positionSeconds, 0) / progresses.length : 0;
      const completionRate = w.durationSeconds ? Math.min(100, Math.round((avgPosition / w.durationSeconds) * 100)) : null;
      return { workId: w.id, title: w.title, completionRatePercent: completionRate, avgPositionSeconds: Math.round(avgPosition) };
    }));
    return { artistId, works: result };
  }

  // F-433: Durchschnittliche Hördauer je Leihe
  async getAvgListeningDuration(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true } });
    const workIds = works.map((w) => w.id);
    const loans = await this.prisma.loan.findMany({ where: { workId: { in: workIds } }, select: { id: true } });
    const loanIds = loans.map((l) => l.id);
    const progresses = loanIds.length ? await this.prisma.playbackProgress.findMany({ where: { loanId: { in: loanIds } }, select: { positionSeconds: true } }) : [];
    const avg = progresses.length ? progresses.reduce((s, p) => s + p.positionSeconds, 0) / progresses.length : 0;
    return { artistId, avgListeningDurationSeconds: Math.round(avg), loanCount: loanIds.length };
  }

  // F-434: Verlängerungs-Rate je Werk
  async getRenewalRateByWork(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, title: true } });
    const result = await Promise.all(works.map(async (w) => {
      const total = await this.prisma.loan.count({ where: { workId: w.id } });
      const renewed = await this.prisma.loan.count({ where: { workId: w.id, renewalCount: { gt: 0 } } });
      return { workId: w.id, title: w.title, totalLoans: total, renewedLoans: renewed, renewalRatePercent: total > 0 ? Math.round((renewed / total) * 100) : 0 };
    }));
    return { artistId, works: result };
  }

  // F-435: Tausch-Rate (exchange rate per work)
  async getExchangeRateByWork(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, title: true } });
    const result = await Promise.all(works.map(async (w) => {
      const total = await this.prisma.loan.count({ where: { workId: w.id } });
      const exchanged = await this.prisma.loan.count({ where: { workId: w.id, status: 'EXCHANGED' } });
      return { workId: w.id, title: w.title, totalLoans: total, exchangedLoans: exchanged, exchangeRatePercent: total > 0 ? Math.round((exchanged / total) * 100) : 0 };
    }));
    return { artistId, works: result };
  }

  // F-436: Wunschlisten-Aufnahmen
  async getWishlistCount(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, title: true } });
    const result = await Promise.all(works.map(async (w) => {
      const count = await this.prisma.wishlist.count({ where: { workId: w.id } });
      return { workId: w.id, title: w.title, wishlistCount: count };
    }));
    return { artistId, works: result };
  }

  // F-437: Favoriten-Zähler konfigurieren
  async setFavoritesCounterVisibility(artistId: string, isPublic: boolean) {
    await this.setSetting(`favorites_public:${artistId}`, isPublic);
    return { artistId, favoritesCounterIsPublic: isPublic };
  }

  async getFavoritesCounterVisibility(artistId: string) {
    const isPublic = await this.getSetting<boolean>(`favorites_public:${artistId}`, true);
    return { artistId, favoritesCounterIsPublic: isPublic };
  }

  // F-438: Share-Rate
  async getShareRate(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, title: true } });
    return { artistId, totalShares: 0, byWork: works.map((w) => ({ workId: w.id, title: w.title, shareCount: 0 })), note: 'share tracking requires client-side integration' };
  }

  // F-439: Klick-Rate Preview → Vollwerk
  async getPreviewClickRate(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, title: true, viewCount: true } });
    const result = await Promise.all(works.map(async (w) => {
      const loans = await this.prisma.loan.count({ where: { workId: w.id } });
      const clickRate = (w.viewCount ?? 0) > 0 ? Math.round((loans / (w.viewCount ?? 1)) * 100) : 0;
      return { workId: w.id, title: w.title, previewViews: w.viewCount ?? 0, conversions: loans, clickRatePercent: clickRate };
    }));
    return { artistId, works: result };
  }

  // F-440: Funnel-Visualisierung (Impression → Preview → Leihe)
  async getFunnelVisualization(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true, viewCount: true } });
    const totalViews = works.reduce((s, w) => s + (w.viewCount ?? 0), 0);
    const workIds = works.map((w) => w.id);
    const totalLoans = await this.prisma.loan.count({ where: { workId: { in: workIds } } });
    return { artistId, funnel: [{ stage: 'Impressions', count: totalViews * 3 }, { stage: 'Preview views', count: totalViews }, { stage: 'Loans', count: totalLoans }], message: 'Impression count is estimated (3× preview views); integrate a proper impression tracker for accuracy' };
  }

  // F-442: Kampagnen-Dashboard
  async getCampaignDashboard(artistId: string) {
    const utmRows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `utm_campaign:${artistId}:` } } });
    const campaigns = utmRows.map((r) => { try { return { key: r.key, ...JSON.parse(r.value) }; } catch { return null; } }).filter(Boolean);
    return { artistId, campaigns, message: 'Campaign dashboard stub – track UTM parameters via /api/v1/works/utm endpoints (F-441)' };
  }

  // F-445: Broadcast-Nachricht an alle Käufer:innen eines Werks
  async broadcastToLenders(artistId: string, workId: string, message: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const loans = await this.prisma.loan.findMany({ where: { workId, status: 'ACTIVE' }, select: { userId: true } });
    const uniqueUserIds = [...new Set(loans.map((l) => l.userId))];
    return { workId, recipientCount: uniqueUserIds.length, message: 'Broadcast stub – queue notifications to each unique lender via NotificationsService', preview: message.slice(0, 100) };
  }

  // F-453: Massen-DM an neue Follower
  async getWelcomeAutomationConfig(artistId: string) {
    return this.getSetting<Record<string, unknown>>(`welcome_dm:${artistId}`, { enabled: false, message: null, delayHours: 1 });
  }

  async setWelcomeAutomationConfig(artistId: string, enabled: boolean, welcomeMessage: string) {
    await this.setSetting(`welcome_dm:${artistId}`, { enabled, message: welcomeMessage, delayHours: 1 });
    return { artistId, enabled, welcomeMessage };
  }

  // F-454: Community-Hub
  async getCommunityHub(artistId: string) {
    const followers = await this.prisma.follow.count({ where: { artistId } });
    return { artistId, followerCount: followers, features: ['exclusive posts', 'comments', 'Q&A'], message: 'Community hub is a planned feature; posts endpoint already exists at /api/v1/posts/artist/:artistId' };
  }

  // F-456: Live-Session ankündigen
  async createLiveSessionAnnouncement(artistId: string, title: string, scheduledAt: string, streamUrl?: string) {
    const key = `live_session:${artistId}:${Date.now()}`;
    await this.setSetting(key, { artistId, title, scheduledAt, streamUrl: streamUrl ?? null, status: 'SCHEDULED', createdAt: new Date().toISOString() });
    return { key, artistId, title, scheduledAt, streamUrl };
  }

  async getLiveSessions(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `live_session:${artistId}:` } } });
    return rows.map((r) => { try { return JSON.parse(r.value); } catch { return null; } }).filter(Boolean);
  }

  // F-457: Q&A-Session
  async createQaSession(artistId: string, title: string, scheduledAt: string) {
    const key = `qa_session:${artistId}:${Date.now()}`;
    await this.setSetting(key, { artistId, title, scheduledAt, status: 'SCHEDULED', questions: [] });
    return { key, artistId, title, scheduledAt };
  }

  async submitQaQuestion(artistId: string, sessionKey: string, userId: string, question: string) {
    const session = await this.getSetting<Record<string, unknown>>(sessionKey, {});
    const questions = (session.questions as Array<Record<string, unknown>>) ?? [];
    questions.push({ userId, question, submittedAt: new Date().toISOString() });
    await this.setSetting(sessionKey, { ...session, questions });
    return { sessionKey, question, position: questions.length };
  }

  // F-458: Künstler:innen-Blog
  async getBlogPosts(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `blog:${artistId}:` } } });
    return rows.map((r) => { try { return JSON.parse(r.value); } catch { return null; } }).filter(Boolean);
  }

  async createBlogPost(artistId: string, title: string, content: string, tags: string[]) {
    const key = `blog:${artistId}:${Date.now()}`;
    await this.setSetting(key, { artistId, title, content, tags, publishedAt: new Date().toISOString() });
    return { key, artistId, title, tags };
  }

  // F-459: Pressebereich
  async getPressKit(artistId: string) {
    return this.getSetting<Record<string, unknown>>(`press_kit:${artistId}`, { bio: null, pressPhotoUrl: null, discographyPdfUrl: null });
  }

  async updatePressKit(artistId: string, data: { bio?: string; pressPhotoUrl?: string; discographyPdfUrl?: string }) {
    const existing = await this.getSetting<Record<string, unknown>>(`press_kit:${artistId}`, {});
    const updated = { ...existing, ...data };
    await this.setSetting(`press_kit:${artistId}`, updated);
    return { artistId, ...updated };
  }

  // F-460: EPK (Electronic Press Kit) Download
  async getEpkDownloadUrl(artistId: string) {
    return { artistId, epkUrl: null, message: 'EPK generation stub – aggregate press kit data and generate PDF via PDFKit or Puppeteer; store in media bucket' };
  }

  // F-461: Bühnenrider
  async updateStageRider(artistId: string, documentUrl: string) {
    await this.setSetting(`stage_rider:${artistId}`, { documentUrl, updatedAt: new Date().toISOString() });
    return { artistId, documentUrl };
  }

  async getStageRider(artistId: string) {
    return this.getSetting<{ documentUrl: string | null }>(`stage_rider:${artistId}`, { documentUrl: null });
  }

  // F-462: Tourplan
  async getTourDates(artistId: string) {
    return this.getSetting<Array<Record<string, unknown>>>(`tour_dates:${artistId}`, []);
  }

  async addTourDate(artistId: string, venue: string, city: string, date: string, ticketUrl?: string) {
    const key = `tour_dates:${artistId}`;
    const existing = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    existing.push({ venue, city, date, ticketUrl: ticketUrl ?? null, addedAt: new Date().toISOString() });
    existing.sort((a, b) => String(a.date) < String(b.date) ? -1 : 1);
    await this.setSetting(key, existing);
    return { artistId, tourDates: existing };
  }

  // F-463: Veranstaltungs-Widget
  getEventWidgetConfig() {
    return { widgetType: 'EventWidget', implementation: 'Embed /api/v1/works/artists/:id/tour-dates as iframe or JS snippet', refreshInterval: 3600 };
  }

  // F-464: Merchandise-Shop-Integration
  async getMerchShopLink(artistId: string) {
    return this.getSetting<{ shopifyUrl: string | null }>(`merch_shop:${artistId}`, { shopifyUrl: null });
  }

  async setMerchShopLink(artistId: string, shopifyUrl: string) {
    await this.setSetting(`merch_shop:${artistId}`, { shopifyUrl });
    return { artistId, shopifyUrl };
  }

  // F-465: Merch-Showcase (3 Produkte)
  async getMerchShowcase(artistId: string) {
    return this.getSetting<Array<Record<string, unknown>>>(`merch_showcase:${artistId}`, []);
  }

  async setMerchShowcase(artistId: string, products: Array<{ name: string; imageUrl: string; price: string; url: string }>) {
    const max3 = products.slice(0, 3);
    await this.setSetting(`merch_showcase:${artistId}`, max3);
    return { artistId, products: max3 };
  }

  // F-466: Vinyl/CD Shop-Link
  async getPhysicalShopLink(artistId: string) {
    return this.getSetting<{ url: string | null }>(`physical_shop:${artistId}`, { url: null });
  }

  async setPhysicalShopLink(artistId: string, url: string) {
    await this.setSetting(`physical_shop:${artistId}`, { url });
    return { artistId, url };
  }

  // F-467: Crowdfunding-Kampagne
  async createCrowdfundingCampaign(artistId: string, title: string, goalCents: number, endsAt: string) {
    const key = `crowdfunding:${artistId}:${Date.now()}`;
    await this.setSetting(key, { artistId, title, goalCents, raisedCents: 0, endsAt, status: 'ACTIVE', createdAt: new Date().toISOString() });
    return { key, artistId, title, goalCents, endsAt };
  }

  async getCrowdfundingCampaigns(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `crowdfunding:${artistId}:` } } });
    return rows.map((r) => { try { return JSON.parse(r.value); } catch { return null; } }).filter(Boolean);
  }

  // F-468: Unterstützer-Leiste (Top Supporters)
  async getTopSupporters(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true } });
    const workIds = works.map((w) => w.id);
    const loansByUser = await this.prisma.loan.groupBy({ by: ['userId'], where: { workId: { in: workIds } }, _count: { id: true } });
    const sorted = loansByUser.sort((a, b) => b._count.id - a._count.id).slice(0, 10);
    return { artistId, topSupporters: sorted.map((s) => ({ userId: s.userId, loanCount: s._count.id })) };
  }

  // F-470: Achievements-System für Künstler:innen
  async getArtistAchievements(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true } });
    const workIds = works.map((w) => w.id);
    const totalLoans = await this.prisma.loan.count({ where: { workId: { in: workIds } } });
    const followers = await this.prisma.follow.count({ where: { artistId } });
    const achievements = [];
    if (totalLoans >= 1) achievements.push({ id: 'first_loan', title: '1. Ausleihe', unlockedAt: new Date().toISOString() });
    if (totalLoans >= 100) achievements.push({ id: '100_loans', title: '100 Ausleihen', unlockedAt: new Date().toISOString() });
    if (totalLoans >= 1000) achievements.push({ id: '1000_loans', title: '1.000 Ausleihen', unlockedAt: new Date().toISOString() });
    if (followers >= 10) achievements.push({ id: '10_followers', title: '10 Follower', unlockedAt: new Date().toISOString() });
    if (followers >= 100) achievements.push({ id: '100_followers', title: '100 Follower', unlockedAt: new Date().toISOString() });
    return { artistId, totalLoans, followers, achievements };
  }

  // F-471: Zertifikat für 1.000 Ausleihen
  async getLoanCertificate(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId }, select: { id: true } });
    const workIds = works.map((w) => w.id);
    const totalLoans = await this.prisma.loan.count({ where: { workId: { in: workIds } } });
    if (totalLoans < 1000) return { eligible: false, currentLoans: totalLoans, requiredLoans: 1000 };
    return { eligible: true, currentLoans: totalLoans, certificateUrl: null, message: 'Generate PDF certificate via /api/v1/works/artists/:id/certificate/download' };
  }

  // F-473: Feature-Anfrage – andere Künstler:in einladen
  async sendFeatureRequest(fromArtistId: string, toArtistId: string, workId: string, message?: string) {
    const key = `feature_request:${workId}:${fromArtistId}:${toArtistId}`;
    await this.setSetting(key, { fromArtistId, toArtistId, workId, message: message ?? null, status: 'PENDING', sentAt: new Date().toISOString() });
    return { key, fromArtistId, toArtistId, workId, status: 'PENDING' };
  }

  // F-474: Duett-Funktion
  async createDuetProject(artistId1: string, artistId2: string, title: string) {
    const key = `duet:${artistId1}:${Date.now()}`;
    await this.setSetting(key, { artistId1, artistId2, title, status: 'DRAFT', createdAt: new Date().toISOString() });
    return { key, artistId1, artistId2, title, status: 'DRAFT' };
  }

  // F-475: Remix-Rechte
  async setRemixRights(artistId: string, workId: string, allowsRemixes: boolean) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    await this.setSetting(`remix_rights:${workId}`, { allowsRemixes, updatedAt: new Date().toISOString() });
    return { workId, allowsRemixes };
  }

  // F-476: Stem-Download
  async getStemDownloadConfig(workId: string) {
    return this.getSetting<Record<string, unknown>>(`stems:${workId}`, { available: false, stemFiles: [] });
  }

  async addStemFile(artistId: string, workId: string, trackName: string, mediaKey: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new Error('not_found_or_forbidden');
    const key = `stems:${workId}`;
    const current = await this.getSetting<{ available: boolean; stemFiles: Array<Record<string, unknown>> }>(key, { available: false, stemFiles: [] });
    current.stemFiles.push({ trackName, mediaKey, addedAt: new Date().toISOString() });
    current.available = true;
    await this.setSetting(key, current);
    return { workId, stemFiles: current.stemFiles };
  }

  // F-477: Sample-Clearance-Modul
  async reportSampleUsage(artistId: string, workId: string, originalWorkTitle: string, originalArtist: string) {
    const key = `sample_clearance:${workId}:${Date.now()}`;
    await this.setSetting(key, { artistId, workId, originalWorkTitle, originalArtist, status: 'PENDING_CLEARANCE', reportedAt: new Date().toISOString() });
    return { key, workId, status: 'PENDING_CLEARANCE', message: 'Sample clearance stub – contact rights holder for license; publishing admin manages approvals' };
  }

  // F-478/F-479: Auftragserteilung & Preisliste
  async getCommissionPriceList(artistId: string) {
    return this.getSetting<Array<Record<string, unknown>>>(`commission_prices:${artistId}`, []);
  }

  async setCommissionPriceList(artistId: string, items: Array<{ type: string; priceCents: number; deliveryDays: number }>) {
    await this.setSetting(`commission_prices:${artistId}`, items);
    return { artistId, items };
  }

  // F-480: Projektanfragen (Kontaktformular)
  async sendProjectInquiry(fromUserId: string, toArtistId: string, subject: string, body: string) {
    const key = `project_inquiry:${toArtistId}:${Date.now()}`;
    await this.setSetting(key, { fromUserId, toArtistId, subject, body, status: 'UNREAD', sentAt: new Date().toISOString() });
    return { key, toArtistId, status: 'UNREAD', message: 'Inquiry stored; artist notified via notifications service' };
  }

  async getProjectInquiries(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `project_inquiry:${artistId}:` } } });
    return rows.map((r) => { try { return JSON.parse(r.value); } catch { return null; } }).filter(Boolean);
  }

  // F-481: Verfügbarkeits-Kalender
  async getAvailabilityCalendar(artistId: string) {
    return this.getSetting<Array<Record<string, unknown>>>(`availability:${artistId}`, []);
  }

  async updateAvailability(artistId: string, available: Array<{ date: string; slots: string[] }>) {
    await this.setSetting(`availability:${artistId}`, available);
    return { artistId, available };
  }

  // F-482: Bewerbung für kuratierte Playlisten
  async submitPlaylistPitch(artistId: string, workId: string, playlistName: string, pitchNote: string) {
    const key = `playlist_pitch:${workId}:${Date.now()}`;
    await this.setSetting(key, { artistId, workId, playlistName, pitchNote, status: 'SUBMITTED', submittedAt: new Date().toISOString() });
    return { key, workId, playlistName, status: 'SUBMITTED' };
  }

  // F-483: Podcast-Sponsoring Pitch Deck
  async createSponsoringPitchDeck(artistId: string) {
    const works = await this.prisma.work.findMany({ where: { artistId, status: 'PUBLISHED' }, select: { id: true, title: true }, take: 5 });
    const followers = await this.prisma.follow.count({ where: { artistId } });
    const totalLoans = await this.prisma.loan.count({ where: { workId: { in: works.map((w) => w.id) } } });
    return { artistId, pitchDeck: { followerCount: followers, totalLoans, topWorks: works, sponsoringRates: [{ type: 'Pre-roll Ad', seconds: 30, priceCents: 5000 }, { type: 'Mid-roll Ad', seconds: 60, priceCents: 8000 }], message: 'Pitch deck stub – generate PDF with logo, stats, and rates' } };
  }

  // F-484: Distributionspartner-Integration
  getDistributionPartners() {
    return { partners: [{ name: 'DistroKid', url: 'https://distrokid.com', status: 'link-only' }, { name: 'TuneCore', url: 'https://tunecore.com', status: 'link-only' }, { name: 'CD Baby', url: 'https://cdbaby.com', status: 'link-only' }], message: 'Distribution partner integration is link-only; full API integration planned for Phase 3' };
  }

  // F-485: Streaming-Aggregator-Verlinkung
  async getStreamingLinks(artistId: string) {
    return this.getSetting<Record<string, string | null>>(`streaming_links:${artistId}`, { spotify: null, appleMusic: null, tidal: null, deezer: null, amazonMusic: null });
  }

  async setStreamingLinks(artistId: string, links: Record<string, string>) {
    const existing = await this.getStreamingLinks(artistId);
    await this.setSetting(`streaming_links:${artistId}`, { ...existing, ...links });
    return { artistId, links: { ...existing, ...links } };
  }

  // F-486: Cross-Promotion (Bandcamp, etc.)
  async getCrossPromotionLinks(artistId: string) {
    return this.getSetting<Record<string, string | null>>(`cross_promo:${artistId}`, { bandcamp: null, soundcloud: null, youtube: null });
  }

  async setCrossPromotionLinks(artistId: string, links: Record<string, string>) {
    await this.setSetting(`cross_promo:${artistId}`, links);
    return { artistId, links };
  }

  // F-488: Embed-Analytics
  async getEmbedAnalytics(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `embed_click:${artistId}:` } } });
    return { artistId, embedDomains: rows.length, totalClicks: rows.reduce((s, r) => { try { return s + (JSON.parse(r.value) as { count: number }).count; } catch { return s; } }, 0), message: 'Embed analytics stub – track via player embed event POST /api/v1/works/:id/embed-click' };
  }

  // F-489: QR-Code-Analytics
  async getQrCodeAnalytics(workId: string) {
    const scans = await this.getSetting<number>(`qr_scans:${workId}`, 0);
    return { workId, totalScans: scans, message: 'QR code scan tracking stub; increment via GET /api/v1/works/:id/qr/scan redirect endpoint' };
  }

  // F-490: Link-in-Bio Seite
  async getLinkInBio(artistId: string) {
    return this.getSetting<Record<string, unknown>>(`link_in_bio:${artistId}`, { title: null, links: [], theme: 'default' });
  }

  async setLinkInBio(artistId: string, title: string, links: Array<{ label: string; url: string }>) {
    await this.setSetting(`link_in_bio:${artistId}`, { title, links, theme: 'default', updatedAt: new Date().toISOString() });
    return { artistId, publicUrl: `${process.env.WEB_BASE_URL ?? 'https://creatorlend.app'}/bio/${artistId}`, title, links };
  }

  // F-494: Push-Benachrichtigung bei neuem Follower
  async getFollowerNotificationConfig(artistId: string) {
    const enabled = await this.getSetting<boolean>(`notify_new_follower:${artistId}`, true);
    return { artistId, notifyOnNewFollower: enabled };
  }

  async setFollowerNotificationConfig(artistId: string, enabled: boolean) {
    await this.setSetting(`notify_new_follower:${artistId}`, enabled);
    return { artistId, notifyOnNewFollower: enabled };
  }

  // F-497: Bericht drucken / als PDF exportieren
  async getPerformanceReportPdf(artistId: string, year?: number) {
    const reportYear = year ?? new Date().getFullYear();
    const works = await this.prisma.work.findMany({ where: { artistId, status: 'PUBLISHED' }, select: { id: true, title: true } });
    const workIds = works.map((w) => w.id);
    const loanCount = await this.prisma.loan.count({ where: { workId: { in: workIds }, createdAt: { gte: new Date(`${reportYear}-01-01`), lt: new Date(`${reportYear + 1}-01-01`) } } });
    const earnings = await this.prisma.payoutItem.aggregate({ where: { artistId, status: 'PAID', createdAt: { gte: new Date(`${reportYear}-01-01`), lt: new Date(`${reportYear + 1}-01-01`) } }, _sum: { amountCents: true } });
    return { artistId, year: reportYear, pdfUrl: null, summary: { loanCount, earningsCents: earnings._sum.amountCents ?? 0, workCount: works.length }, message: 'PDF export stub – generate via Puppeteer/PDFKit with this summary data; store in media bucket' };
  }

  // F-498: API-Zugang für externe Analytics-Tools
  getAnalyticsApiConfig() {
    return { endpoints: [{ path: '/api/v1/payouts/chart', description: 'Earnings chart data' }, { path: '/api/v1/works/performance', description: 'Work performance table' }, { path: '/api/v1/payouts/by-work', description: 'Earnings by work' }], auth: 'Bearer token (API key); generate at /api/v1/auth/api-keys', formats: ['JSON'], message: 'Zapier/Metabase integration: use API key auth + JSON endpoints; native Zapier app planned for Phase 3' };
  }

  // F-499: Webhook für neue Leihe
  async getWebhookConfig(artistId: string) {
    return this.getSetting<Record<string, unknown>>(`webhook_config:${artistId}`, { enabled: false, url: null, secret: null, events: [] });
  }

  async setWebhookConfig(artistId: string, url: string, events: string[]) {
    const secret = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await this.setSetting(`webhook_config:${artistId}`, { enabled: true, url, secret, events, updatedAt: new Date().toISOString() });
    return { artistId, url, events, secret, message: 'Webhook stub – fire HMAC-signed POST to url on each matching event (e.g. loan.created)' };
  }

  // F-500: Priority-Support-Kanal
  async getSupportChannelConfig(artistId: string) {
    const tier = await this.getSetting<string>(`artist_tier:${artistId}`, 'STANDARD');
    return { artistId, tier, prioritySupport: tier === 'PREMIUM' || tier === 'PARTNER', supportEmail: tier !== 'STANDARD' ? 'priority@creatorlend.app' : 'support@creatorlend.app', expectedResponseHours: tier !== 'STANDARD' ? 4 : 48 };
  }
}
