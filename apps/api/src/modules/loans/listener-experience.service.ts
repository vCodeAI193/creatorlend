import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ListenerExperienceService {
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

  // F-501–510: UI Preferences
  async getUiPreferences(userId: string) {
    const prefs = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {
      darkMode: 'system',
      autoThemeByTime: false,
      highContrast: false,
      readMode: false,
      fontSize: 16,
      fontFamily: 'default',
      lineSpacing: 1.5,
      serifFont: false,
      ambientSound: null,
      focusMode: false,
    });
    return { userId, preferences: prefs };
  }

  async setUiPreferences(userId: string, preferences: Record<string, unknown>) {
    const existing = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {});
    const merged = { ...existing, ...preferences };
    await this.setSetting(`ui_prefs:${userId}`, merged);
    return { userId, preferences: merged };
  }

  // F-501: Dark mode
  async getDarkMode(userId: string) {
    const prefs = await this.getSetting<{ darkMode?: string }>(`ui_prefs:${userId}`, {});
    return { userId, darkMode: prefs.darkMode ?? 'system' };
  }

  async setDarkMode(userId: string, mode: string) {
    const prefs = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {});
    await this.setSetting(`ui_prefs:${userId}`, { ...prefs, darkMode: mode });
    return { userId, darkMode: mode };
  }

  // F-502: Auto theme by time
  async getThemeTimeBasedConfig(userId: string) {
    const cfg = await this.getSetting<Record<string, unknown>>(`theme_time:${userId}`, { enabled: false, lightStart: '06:00', darkStart: '20:00' });
    return { userId, config: cfg };
  }

  async setThemeTimeBasedConfig(userId: string, config: Record<string, unknown>) {
    await this.setSetting(`theme_time:${userId}`, config);
    return { userId, config };
  }

  // F-503/F-540: High contrast / accessibility settings
  async getAccessibilitySettings(userId: string) {
    const settings = await this.getSetting<Record<string, unknown>>(`accessibility:${userId}`, {
      highContrast: false,
      reduceMotion: false,
      largeButtons: false,
      screenReaderOptimized: false,
    });
    return { userId, settings };
  }

  async setAccessibilitySettings(userId: string, settings: Record<string, unknown>) {
    const existing = await this.getSetting<Record<string, unknown>>(`accessibility:${userId}`, {});
    const merged = { ...existing, ...settings };
    await this.setSetting(`accessibility:${userId}`, merged);
    return { userId, settings: merged };
  }

  // F-504: Read mode
  async getReadMode(userId: string) {
    const prefs = await this.getSetting<{ readMode?: boolean }>(`ui_prefs:${userId}`, {});
    return { userId, readMode: prefs.readMode ?? false };
  }

  async setReadMode(userId: string, enabled: boolean) {
    const prefs = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {});
    await this.setSetting(`ui_prefs:${userId}`, { ...prefs, readMode: enabled });
    return { userId, readMode: enabled };
  }

  // F-505–508: Font preferences
  async getFontPreferences(userId: string) {
    const prefs = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {});
    return {
      userId,
      fontSize: prefs.fontSize ?? 16,
      fontFamily: prefs.fontFamily ?? 'default',
      lineSpacing: prefs.lineSpacing ?? 1.5,
      serifFont: prefs.serifFont ?? false,
    };
  }

  async setFontPreferences(userId: string, fontPrefs: Record<string, unknown>) {
    const prefs = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {});
    const merged = { ...prefs, ...fontPrefs };
    await this.setSetting(`ui_prefs:${userId}`, merged);
    return { userId, fontPreferences: fontPrefs };
  }

  // F-509: Ambient sound
  async getAmbientSoundConfig(userId: string) {
    const cfg = await this.getSetting<Record<string, unknown>>(`ambient:${userId}`, { sound: null, volume: 0.3 });
    return { userId, config: cfg, availableSounds: ['rain', 'cafe', 'forest', 'ocean', 'white_noise', 'fireplace'] };
  }

  async setAmbientSoundConfig(userId: string, config: Record<string, unknown>) {
    await this.setSetting(`ambient:${userId}`, config);
    return { userId, config };
  }

  // F-510: Focus mode
  async getFocusMode(userId: string) {
    const prefs = await this.getSetting<{ focusMode?: boolean }>(`ui_prefs:${userId}`, {});
    return { userId, focusMode: prefs.focusMode ?? false };
  }

  async setFocusMode(userId: string, enabled: boolean) {
    const prefs = await this.getSetting<Record<string, unknown>>(`ui_prefs:${userId}`, {});
    await this.setSetting(`ui_prefs:${userId}`, { ...prefs, focusMode: enabled });
    return { userId, focusMode: enabled };
  }

  // F-511: Countdown remaining loan hours
  async getActiveLoanCountdown(loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId }, select: { id: true, expiresAt: true, status: true } });
    if (!loan) return { loanId, error: 'not_found' };
    const now = Date.now();
    const expiresMs = loan.expiresAt.getTime();
    const remainingMs = Math.max(0, expiresMs - now);
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return { loanId, status: loan.status, expiresAt: loan.expiresAt, remainingMs, remainingHours, remainingMinutes, isExpired: remainingMs === 0 };
  }

  // F-512: Progress bar (% listened)
  async getWorkListeningProgress(userId: string, workId: string) {
    const loan = await this.prisma.loan.findFirst({ where: { userId, workId, status: 'ACTIVE' }, select: { id: true, expiresAt: true } });
    if (!loan) return { userId, workId, progressPercent: 0, positionSeconds: 0, loanFound: false };
    const progress = await this.prisma.playbackProgress.findUnique({ where: { loanId: loan.id }, select: { positionSeconds: true } });
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { durationSeconds: true } });
    const pos = progress?.positionSeconds ?? 0;
    const dur = work?.durationSeconds ?? 0;
    const pct = dur > 0 ? Math.round((pos / dur) * 100) : 0;
    return { userId, workId, loanId: loan.id, positionSeconds: pos, durationSeconds: dur, progressPercent: pct };
  }

  // F-513: Emoji reactions on transcript positions
  async getTranscriptReactions(userId: string, workId: string) {
    const key = `transcript_reactions:${workId}:${userId}`;
    const reactions = await this.getSetting<Array<{ positionSeconds: number; emoji: string; createdAt: string }>>( key, []);
    return { userId, workId, reactions };
  }

  async addTranscriptReaction(userId: string, workId: string, positionSeconds: number, emoji: string) {
    const key = `transcript_reactions:${workId}:${userId}`;
    const reactions = await this.getSetting<Array<{ positionSeconds: number; emoji: string; createdAt: string }>>(key, []);
    const newReaction = { positionSeconds, emoji, createdAt: new Date().toISOString() };
    reactions.push(newReaction);
    await this.setSetting(key, reactions);
    return { userId, workId, reaction: newReaction };
  }

  // F-514: Scene markers / climax sharing
  async getSceneMarkers(userId: string, workId: string) {
    const key = `scene_markers:${workId}:${userId}`;
    const markers = await this.getSetting<Array<{ positionSeconds: number; label: string; isPublic: boolean }>>(key, []);
    return { userId, workId, markers };
  }

  async addSceneMarker(userId: string, workId: string, positionSeconds: number, label: string, isPublic = false) {
    const key = `scene_markers:${workId}:${userId}`;
    const markers = await this.getSetting<Array<{ positionSeconds: number; label: string; isPublic: boolean }>>(key, []);
    const marker = { positionSeconds, label, isPublic };
    markers.push(marker);
    await this.setSetting(key, markers);
    return { userId, workId, marker };
  }

  // F-515: Social listening — who borrowed same work
  async getCurrentListeners(workId: string) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLoans = await this.prisma.loan.findMany({
      where: { workId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { userId: true },
      take: 50,
    });
    return { workId, currentListenersCount: recentLoans.length, note: 'live_tracking_requires_websocket', updatedAt: hourAgo };
  }

  // F-516: Group listening session
  async createGroupListeningSession(hostUserId: string, workId: string, invitedUserIds: string[]) {
    const sessionId = `gls_${hostUserId}_${workId}_${Date.now()}`;
    const session = { sessionId, hostUserId, workId, invitedUserIds, status: 'WAITING', createdAt: new Date().toISOString() };
    await this.setSetting(`group_session:${sessionId}`, session);
    return { session, joinUrl: `/listen/group/${sessionId}`, note: 'realtime_sync_requires_websocket' };
  }

  async getGroupListeningSession(sessionId: string) {
    const session = await this.getSetting<Record<string, unknown>>(`group_session:${sessionId}`, null as unknown as Record<string, unknown>);
    if (!session) return { sessionId, error: 'not_found' };
    return { session };
  }

  // F-517: Listening party chat
  async getListeningPartyChat(sessionId: string) {
    const messages = await this.getSetting<Array<{ userId: string; text: string; createdAt: string }>>(`party_chat:${sessionId}`, []);
    return { sessionId, messages, note: 'realtime_chat_requires_websocket' };
  }

  async sendListeningPartyMessage(sessionId: string, userId: string, text: string) {
    const messages = await this.getSetting<Array<{ userId: string; text: string; createdAt: string }>>(`party_chat:${sessionId}`, []);
    const msg = { userId, text, createdAt: new Date().toISOString() };
    messages.push(msg);
    if (messages.length > 200) messages.shift();
    await this.setSetting(`party_chat:${sessionId}`, messages);
    return { sessionId, message: msg };
  }

  // F-518: Reactions overlay
  async getReactionsOverlayConfig(userId: string) {
    const cfg = await this.getSetting<Record<string, unknown>>(`reactions_overlay:${userId}`, { enabled: true, opacity: 0.7, position: 'bottom' });
    return { userId, config: cfg };
  }

  async setReactionsOverlayConfig(userId: string, config: Record<string, unknown>) {
    await this.setSetting(`reactions_overlay:${userId}`, config);
    return { userId, config };
  }

  // F-519: Prompt rating after loan expiry
  async checkRatingPrompt(userId: string, workId: string) {
    const existing = await this.prisma.rating.findUnique({ where: { userId_workId: { userId, workId } } });
    const existingReview = await this.prisma.review.findUnique({ where: { userId_workId: { userId, workId } } });
    return { userId, workId, hasRating: !!existing, hasReview: !!existingReview, shouldPrompt: !existing };
  }

  // F-521: One-tap star rating
  async createOrUpdateRating(userId: string, workId: string, value: number) {
    if (value < 1 || value > 5) return { error: 'value_out_of_range', validRange: '1-5' };
    const rating = await this.prisma.rating.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, value },
      update: { value },
    });
    return { rating };
  }

  // F-522: Detailed review
  async createOrUpdateReview(userId: string, workId: string, body: string, rating?: number, hasSpoiler = false) {
    if (body.length > 500) return { error: 'body_too_long', maxLength: 500 };
    const isVerifiedBuyer = await this.prisma.loan.count({ where: { userId, workId } }) > 0;
    const review = await this.prisma.review.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, body, rating, isVerifiedBuyer },
      update: { body, rating, updatedAt: new Date() },
    });
    if (hasSpoiler) await this.setSetting(`review_spoiler:${review.id}`, true);
    return { review };
  }

  // F-523: Helpful voting on reviews
  async voteReviewHelpful(userId: string, reviewId: string, helpful: boolean) {
    const vote = await this.prisma.reviewVote.upsert({
      where: { reviewId_userId: { reviewId, userId } },
      create: { reviewId, userId, helpful },
      update: { helpful },
    });
    return { vote };
  }

  // F-525: Spoiler warning
  async getReviewSpoilerFlag(reviewId: string) {
    const hasSpoiler = await this.getSetting<boolean>(`review_spoiler:${reviewId}`, false);
    return { reviewId, hasSpoiler };
  }

  // F-526: Edit own review → reuses createOrUpdateReview

  // F-527: Review history on public profile
  async getUserReviewHistory(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      select: { id: true, workId: true, body: true, rating: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { userId, reviews };
  }

  // F-528: Comment on reviews → stub (no separate Comment model for reviews)
  async getReviewComments(reviewId: string) {
    const comments = await this.getSetting<Array<{ userId: string; text: string; createdAt: string }>>(`review_comments:${reviewId}`, []);
    return { reviewId, comments };
  }

  async addReviewComment(reviewId: string, userId: string, text: string) {
    const comments = await this.getSetting<Array<{ userId: string; text: string; createdAt: string }>>(`review_comments:${reviewId}`, []);
    const comment = { userId, text, createdAt: new Date().toISOString() };
    comments.push(comment);
    await this.setSetting(`review_comments:${reviewId}`, comments);
    return { reviewId, comment };
  }

  // F-529: Sort reviews
  async getReviews(workId: string, sort: string = 'newest', verifiedOnly = false) {
    const where: { workId: string; hidden: boolean; isVerifiedBuyer?: boolean } = { workId, hidden: false };
    if (verifiedOnly) where.isVerifiedBuyer = true;
    const orderBy: Record<string, 'asc' | 'desc'>[] =
      sort === 'newest' ? [{ createdAt: 'desc' }] :
      sort === 'lowest' ? [{ rating: 'asc' }] :
      [{ createdAt: 'desc' }];
    const reviews = await this.prisma.review.findMany({ where, orderBy, take: 50, include: { votes: true } });
    const enriched = reviews.map((r) => ({
      ...r,
      helpfulCount: r.votes.filter((v) => v.helpful).length,
      notHelpfulCount: r.votes.filter((v) => !v.helpful).length,
    }));
    if (sort === 'helpful') enriched.sort((a, b) => b.helpfulCount - a.helpfulCount);
    return { workId, sort, verifiedOnly, reviews: enriched };
  }

  // F-531: Multi-criteria rating
  async createDetailedRating(userId: string, workId: string, criteria: { narrator?: number; story?: number; quality?: number }) {
    await this.setSetting(`detailed_rating:${workId}:${userId}`, criteria);
    const avg = Math.round(Object.values(criteria).filter(Boolean).reduce((s, v) => s + (v as number), 0) / Object.values(criteria).filter(Boolean).length);
    await this.createOrUpdateRating(userId, workId, avg);
    return { userId, workId, criteria, averageValue: avg };
  }

  async getDetailedRatings(workId: string) {
    const ratings = await this.prisma.rating.findMany({ where: { workId }, select: { userId: true, value: true } });
    const criteriaKeys = ['narrator', 'story', 'quality'];
    const sums: Record<string, number> = { narrator: 0, story: 0, quality: 0 };
    const counts: Record<string, number> = { narrator: 0, story: 0, quality: 0 };
    for (const r of ratings) {
      const detail = await this.getSetting<Record<string, number>>(`detailed_rating:${workId}:${r.userId}`, {});
      for (const key of criteriaKeys) {
        if (detail[key]) { sums[key] += detail[key]; counts[key]++; }
      }
    }
    return {
      workId,
      averages: criteriaKeys.reduce<Record<string, number | null>>((acc, k) => {
        acc[k] = counts[k] > 0 ? Math.round((sums[k] / counts[k]) * 10) / 10 : null;
        return acc;
      }, {}),
    };
  }

  // F-532: Word cloud stub
  async getReviewWordCloud(workId: string) {
    return { workId, wordCloud: [], note: 'word_cloud_generation_requires_nlp_service' };
  }

  // F-533: Sentiment analysis stub
  async getReviewSentimentAnalysis(workId: string) {
    const reviews = await this.prisma.review.count({ where: { workId, hidden: false } });
    return { workId, totalReviews: reviews, sentiment: { positive: 0, neutral: 0, negative: 0 }, note: 'sentiment_analysis_requires_ml_service' };
  }

  // F-534: AI summary stub
  async getReviewAiSummary(workId: string) {
    return { workId, summary: null, note: 'ai_summary_requires_llm_integration' };
  }

  // F-535: Interest tags
  async getInterestTags(userId: string) {
    const tags = await this.getSetting<string[]>(`interest_tags:${userId}`, []);
    return { userId, tags };
  }

  async setInterestTags(userId: string, tags: string[]) {
    await this.setSetting(`interest_tags:${userId}`, tags);
    return { userId, tags };
  }

  // F-536: Dismiss recommendation
  async dismissRecommendation(userId: string, workId: string) {
    const dismissed = await this.getSetting<string[]>(`dismissed_recs:${userId}`, []);
    if (!dismissed.includes(workId)) dismissed.push(workId);
    await this.setSetting(`dismissed_recs:${userId}`, dismissed);
    return { userId, workId, dismissed: true };
  }

  // F-537: More like this
  async markMoreLikeThis(userId: string, workId: string) {
    const liked = await this.getSetting<string[]>(`more_like_this:${userId}`, []);
    if (!liked.includes(workId)) liked.push(workId);
    await this.setSetting(`more_like_this:${userId}`, liked);
    return { userId, workId, feedbackSent: true };
  }

  // F-538: Mood vote after listening
  async submitMoodRating(userId: string, workId: string, mood: string) {
    await this.setSetting(`mood_vote:${workId}:${userId}`, { mood, createdAt: new Date().toISOString() });
    return { userId, workId, mood };
  }

  // F-539: Inactivity feedback
  async submitInactivityFeedback(userId: string, feedback: string) {
    await this.setSetting(`inactivity_feedback:${userId}`, { feedback, createdAt: new Date().toISOString() });
    return { userId, feedbackReceived: true };
  }

  // F-541–543: Keyboard/Screen reader config (client-side)
  async getPlayerKeyboardConfig() {
    return {
      shortcuts: {
        playPause: 'Space',
        seekForward: 'ArrowRight',
        seekBack: 'ArrowLeft',
        volumeUp: 'ArrowUp',
        volumeDown: 'ArrowDown',
        speedUp: 'Shift+ArrowRight',
        speedDown: 'Shift+ArrowLeft',
        bookmark: 'b',
        closePlayer: 'Escape',
      },
      note: 'keyboard_navigation_implemented_client_side',
    };
  }

  async getAriaConfig() {
    return { ariaLabelsComplete: true, screenReaderOptimized: true, focusTrapEnabled: true, note: 'aria_labels_implemented_client_side' };
  }

  // F-544–547: Onboarding
  async getTooltipConfig(userId: string) {
    const seen = await this.getSetting<string[]>(`tooltips_seen:${userId}`, []);
    const allTooltips = ['player_controls', 'bookmark', 'loan_countdown', 'renewal', 'exchange', 'wishlist', 'rating_prompt', 'settings'];
    return { userId, seenTooltips: seen, unseenTooltips: allTooltips.filter((t) => !seen.includes(t)) };
  }

  async markTooltipSeen(userId: string, tooltipId: string) {
    const seen = await this.getSetting<string[]>(`tooltips_seen:${userId}`, []);
    if (!seen.includes(tooltipId)) seen.push(tooltipId);
    await this.setSetting(`tooltips_seen:${userId}`, seen);
    return { userId, tooltipId, marked: true };
  }

  async getOnboardingStatus(userId: string) {
    const status = await this.getSetting<Record<string, boolean>>(`onboarding:${userId}`, {
      profileComplete: false,
      firstLoan: false,
      firstRating: false,
      firstBookmark: false,
      tourComplete: false,
    });
    const stepsComplete = Object.values(status).filter(Boolean).length;
    const totalSteps = Object.keys(status).length;
    return { userId, status, progress: { stepsComplete, totalSteps, percentComplete: Math.round((stepsComplete / totalSteps) * 100) } };
  }

  async completeOnboardingStep(userId: string, step: string) {
    const status = await this.getSetting<Record<string, boolean>>(`onboarding:${userId}`, {});
    status[step] = true;
    await this.setSetting(`onboarding:${userId}`, status);
    return { userId, step, completed: true };
  }

  async getGuidedTourStatus(userId: string) {
    const tourDone = await this.getSetting<boolean>(`tour_complete:${userId}`, false);
    return { userId, tourComplete: tourDone };
  }

  async completeGuidedTour(userId: string) {
    await this.setSetting(`tour_complete:${userId}`, true);
    await this.completeOnboardingStep(userId, 'tourComplete');
    return { userId, tourComplete: true };
  }

  // F-548: Skill progress
  async getSkillProgress(userId: string) {
    const totalLoans = await this.prisma.loan.count({ where: { userId } });
    const uniqueWorks = await this.prisma.loan.findMany({ where: { userId }, select: { workId: true }, distinct: ['workId'] });
    const badges = [];
    if (totalLoans >= 1) badges.push({ id: 'first_loan', label: 'Erste Leihe!' });
    if (totalLoans >= 5) badges.push({ id: 'five_loans', label: '5 Werke ausgeliehen' });
    if (totalLoans >= 10) badges.push({ id: 'ten_loans', label: '10 Werke Meilenstein' });
    if (totalLoans >= 50) badges.push({ id: 'fifty_loans', label: 'Vielleser:in' });
    if (uniqueWorks.length >= 3) badges.push({ id: 'diverse_taste', label: 'Vielseitig' });
    return { userId, totalLoans, uniqueWorksCount: uniqueWorks.length, badges };
  }

  // F-549: Listener of the month
  async getListenerOfMonth(period: string) {
    const data = await this.getSetting<Record<string, unknown>>(`listener_of_month:${period}`, null as unknown as Record<string, unknown>);
    return { period, winner: data, note: 'set_by_admin_via_admin_panel' };
  }

  // F-550: Monthly reading challenge
  async getMonthlyChallenge(userId: string) {
    const key = `monthly_goal:${userId}`;
    const goal = await this.getSetting<{ target: number; period: string } | null>(key, null);
    if (!goal) return { userId, hasGoal: false };
    const periodStart = new Date(goal.period);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const achieved = await this.prisma.loan.count({ where: { userId, createdAt: { gte: periodStart, lt: periodEnd } } });
    return { userId, goal, achieved, progressPercent: Math.min(100, Math.round((achieved / goal.target) * 100)) };
  }

  async setMonthlyGoal(userId: string, targetWorks: number, period: string) {
    await this.setSetting(`monthly_goal:${userId}`, { target: targetWorks, period });
    return { userId, targetWorks, period };
  }

  // F-551: Challenge friend
  async challengeFriend(userId: string, friendId: string, targetCount: number, period: string) {
    const challengeId = `challenge_${userId}_${friendId}_${period}`;
    const challenge = { challengerId: userId, challengedId: friendId, targetCount, period, createdAt: new Date().toISOString() };
    await this.setSetting(challengeId, challenge);
    return { challengeId, challenge };
  }

  // F-552–553: Yearly stats
  async getYearlyStats(userId: string, year: number) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00Z`);
    const loans = await this.prisma.loan.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      include: { work: { select: { type: true, durationSeconds: true, title: true } } },
    });
    const totalHours = loans.reduce((s, l) => s + Math.round((l.work.durationSeconds ?? 0) / 3600), 0);
    const byType = loans.reduce<Record<string, number>>((acc, l) => { acc[l.work.type] = (acc[l.work.type] ?? 0) + 1; return acc; }, {});
    return { userId, year, totalLoans: loans.length, totalHours, byType, topWorks: loans.slice(0, 5).map((l) => ({ title: l.work.title, type: l.work.type })) };
  }

  async getYearlyStatsPoster(userId: string, year: number) {
    return { userId, year, posterUrl: null, note: 'poster_generation_requires_image_service', dataAvailableAt: `/api/v1/listener/stats/${year}` };
  }

  // F-554: Hour equivalent
  async getHourEquivalent(userId: string) {
    const loans = await this.prisma.loan.findMany({ where: { userId }, include: { work: { select: { durationSeconds: true } } } });
    const totalSeconds = loans.reduce((s, l) => s + (l.work.durationSeconds ?? 0), 0);
    const totalHours = Math.round(totalSeconds / 3600);
    const totalDays = Math.round(totalHours / 24);
    const bookEquivalent = Math.round(totalHours / 10);
    return { userId, totalSeconds, totalHours, totalDays, bookEquivalent, message: `Du hast ${bookEquivalent} Bücher in ${totalHours} Stunden gehört` };
  }

  // F-555–557: Quote features
  async createQuote(userId: string, loanId: string, text: string, positionSeconds: number) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId }, select: { workId: true } });
    if (!loan) return { error: 'loan_not_found' };
    const quoteId = `quote_${userId}_${loanId}_${positionSeconds}`;
    const quote = { quoteId, userId, loanId, workId: loan.workId, text, positionSeconds, createdAt: new Date().toISOString() };
    const existing = await this.getSetting<Record<string, unknown>[]>(`quotes:${userId}`, []);
    existing.push(quote);
    await this.setSetting(`quotes:${userId}`, existing);
    return { quote };
  }

  async getQuotes(userId: string) {
    const quotes = await this.getSetting<Record<string, unknown>[]>(`quotes:${userId}`, []);
    return { userId, quotes };
  }

  async createQuoteCard(userId: string, quoteId: string) {
    return { userId, quoteId, cardUrl: null, note: 'image_card_generation_requires_canvas_service' };
  }

  // F-558–560: Vocabulary / flashcards
  async getVocabList(userId: string, workId: string) {
    const vocab = await this.getSetting<Array<{ term: string; definition: string }>>(`vocab:${workId}:${userId}`, []);
    return { userId, workId, vocab };
  }

  async addVocabItem(userId: string, workId: string, term: string, definition = '') {
    const vocab = await this.getSetting<Array<{ term: string; definition: string }>>(`vocab:${workId}:${userId}`, []);
    vocab.push({ term, definition });
    await this.setSetting(`vocab:${workId}:${userId}`, vocab);
    return { userId, workId, term, definition };
  }

  async getFlashcards(userId: string, workId: string) {
    const vocab = await this.getSetting<Array<{ term: string; definition: string }>>(`vocab:${workId}:${userId}`, []);
    return { userId, workId, flashcards: vocab.map((v) => ({ front: v.term, back: v.definition })) };
  }

  async getAnkiExportUrl(userId: string, workId: string) {
    return { userId, workId, exportUrl: null, note: 'anki_export_requires_anki_connect_integration' };
  }

  // F-561: Sync mode (listen and read simultaneously)
  async getSyncModeConfig(userId: string, workId: string) {
    const cfg = await this.getSetting<Record<string, unknown>>(`sync_mode:${workId}:${userId}`, { enabled: false, highlightColor: '#ffff00' });
    return { userId, workId, config: cfg };
  }

  async setSyncModeConfig(userId: string, workId: string, config: Record<string, unknown>) {
    await this.setSetting(`sync_mode:${workId}:${userId}`, config);
    return { userId, workId, config };
  }

  // F-562–563: E-book / PDF
  async getCompanionMaterials(workId: string) {
    const materials = await this.getSetting<Array<{ type: string; key: string; label: string }>>(`companion_materials:${workId}`, []);
    return { workId, materials };
  }

  // F-564: Wikipedia link
  async getWikipediaContext(workId: string) {
    const link = await this.getSetting<string | null>(`wikipedia_link:${workId}`, null);
    return { workId, wikipediaUrl: link };
  }

  // F-565: Similarity detection stub
  async getSimilarNonFictionWorks(workId: string) {
    return { workId, similar: [], note: 'similarity_detection_requires_ml_service' };
  }

  // F-566–568: Tempo / Focus tracking
  async getTempoTracking(userId: string, loanId: string) {
    const key = `tempo_events:${loanId}`;
    const events = await this.getSetting<Array<{ speed: number; timestamp: string }>>( key, []);
    const avgSpeed = events.length > 0 ? events.reduce((s, e) => s + e.speed, 0) / events.length : 1.0;
    return { userId, loanId, averageSpeed: Math.round(avgSpeed * 10) / 10, totalSessions: events.length };
  }

  async recordTempoEvent(loanId: string, speed: number) {
    const key = `tempo_events:${loanId}`;
    const events = await this.getSetting<Array<{ speed: number; timestamp: string }>>(key, []);
    events.push({ speed, timestamp: new Date().toISOString() });
    if (events.length > 100) events.shift();
    await this.setSetting(key, events);
    return { loanId, speed, recorded: true };
  }

  async getFocusScore(userId: string, loanId: string) {
    return { userId, loanId, focusScore: null, note: 'focus_score_requires_rewind_frequency_tracking_client_side' };
  }

  // F-569: Learning goal assistant
  async getLearningGoal(userId: string, workId: string) {
    const goal = await this.getSetting<Record<string, unknown> | null>(`learning_goal:${workId}:${userId}`, null);
    return { userId, workId, goal };
  }

  async setLearningGoal(userId: string, workId: string, goal: Record<string, unknown>) {
    await this.setSetting(`learning_goal:${workId}:${userId}`, goal);
    return { userId, workId, goal };
  }

  // F-570: Mindmap from chapter structure
  async getMindmap(workId: string) {
    const chapters = await this.prisma.chapterMark.findMany({
      where: { workId },
      orderBy: { positionSeconds: 'asc' },
      select: { id: true, title: true, positionSeconds: true },
    });
    return {
      workId,
      mindmap: { title: 'Content Structure', nodes: chapters.map((c) => ({ id: c.id, label: c.title, positionSeconds: c.positionSeconds })) },
      note: 'visual_mindmap_rendering_is_client_side',
    };
  }
}
