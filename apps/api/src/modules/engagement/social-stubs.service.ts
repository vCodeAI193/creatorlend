import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SocialStubsService {
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

  // F-571: Public activity feed
  async getActivityFeed(userId: string) {
    const following = await this.prisma.follow.findMany({ where: { followerId: userId }, select: { artistId: true } });
    const artistIds = following.map((f) => f.artistId);
    const recentLoans = await this.prisma.loan.findMany({
      where: { userId: { in: artistIds }, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { work: { select: { title: true, type: true, coverKey: true } } },
    });
    return { userId, feed: recentLoans.map((l) => ({ type: 'LOAN', userId: l.userId, work: l.work, createdAt: l.createdAt })) };
  }

  // F-572: Activity feed privacy
  async getActivityFeedPrivacy(userId: string) {
    const isPublic = await this.getSetting<boolean>(`activity_public:${userId}`, true);
    return { userId, activityFeedPublic: isPublic };
  }

  async setActivityFeedPrivacy(userId: string, isPublic: boolean) {
    await this.setSetting(`activity_public:${userId}`, isPublic);
    return { userId, activityFeedPublic: isPublic };
  }

  // F-573: Friend recommendations
  async getFriendRecommendations(userId: string) {
    return { userId, recommendations: [], note: 'collaborative_filtering_requires_ml_service' };
  }

  // F-574: Mutual follow check
  async getMutualFollowStatus(userId: string, targetId: string) {
    const iFollow = await this.prisma.follow.findUnique({ where: { followerId_artistId: { followerId: userId, artistId: targetId } } });
    const theyFollow = await this.prisma.follow.findUnique({ where: { followerId_artistId: { followerId: targetId, artistId: userId } } });
    return { userId, targetId, iFollow: !!iFollow, theyFollow: !!theyFollow, isMutual: !!iFollow && !!theyFollow };
  }

  // F-575: Follower list public/private
  async getFollowerListVisibility(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { followerListPublic: true } });
    return { userId, followerListPublic: user?.followerListPublic ?? true };
  }

  async setFollowerListVisibility(userId: string, isPublic: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { followerListPublic: isPublic } });
    return { userId, followerListPublic: isPublic };
  }

  // F-576: Follower search
  async searchFollowers(artistId: string, query: string) {
    const followers = await this.prisma.follow.findMany({ where: { artistId }, select: { followerId: true } });
    const followerIds = followers.map((f) => f.followerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: followerIds }, OR: [{ displayName: { contains: query } }, { slug: { contains: query } }] },
      select: { id: true, displayName: true, slug: true },
    });
    return { artistId, query, results: users };
  }

  // F-577: Block follower
  async blockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    await this.prisma.follow.deleteMany({ where: { OR: [{ followerId: blockerId, artistId: blockedId }, { followerId: blockedId, artistId: blockerId }] } });
    return { blockerId, blockedId, blocked: true };
  }

  // F-578: Blocklist
  async getBlocklist(userId: string) {
    const blocks = await this.prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
    const blockedIds = blocks.map((b) => b.blockedId);
    const users = await this.prisma.user.findMany({ where: { id: { in: blockedIds } }, select: { id: true, displayName: true, slug: true } });
    return { userId, blocked: users };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { blockerId, blockedId, unblocked: true };
  }

  // F-579: Report user profile
  async reportUser(reporterId: string, targetUserId: string, reason: string, description?: string) {
    const report = await this.prisma.report.create({ data: { reporterId, targetType: 'User', targetId: targetUserId, reason, description } });
    return { report };
  }

  // F-580–585: Direct messages
  async sendDm(senderId: string, recipientId: string, body: string, metadata?: Record<string, unknown>) {
    const isBlocked = await this.prisma.block.findFirst({ where: { OR: [{ blockerId: recipientId, blockedId: senderId }, { blockerId: senderId, blockedId: recipientId }] } });
    if (isBlocked) return { error: 'blocked' };
    const dmPrefs = await this.getSetting<{ onlyFollowers?: boolean }>(`dm_prefs:${recipientId}`, {});
    if (dmPrefs.onlyFollowers) {
      const follows = await this.prisma.follow.findUnique({ where: { followerId_artistId: { followerId: recipientId, artistId: senderId } } });
      if (!follows) return { error: 'dm_filter_only_followers' };
    }
    const message = await this.prisma.directMessage.create({
      data: { senderId, recipientId, body, ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}) },
    });
    return { message };
  }

  async getDmConversation(userId: string, otherId: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId, recipientId: otherId }, { senderId: otherId, recipientId: userId }] },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    await this.prisma.directMessage.updateMany({ where: { recipientId: userId, senderId: otherId, readAt: null }, data: { readAt: new Date() } });
    return { userId, otherId, messages };
  }

  async getDmInbox(userId: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const threads = new Map<string, (typeof messages)[0]>();
    for (const m of messages) {
      const otherId = m.senderId === userId ? m.recipientId : m.senderId;
      if (!threads.has(otherId)) threads.set(otherId, m);
    }
    return { userId, threads: Array.from(threads.entries()).map(([otherId, lastMessage]) => ({ otherId, lastMessage })) };
  }

  // F-581: DM filter
  async getDmPreferences(userId: string) {
    const prefs = await this.getSetting<Record<string, unknown>>(`dm_prefs:${userId}`, { onlyFollowers: false });
    return { userId, dmPreferences: prefs };
  }

  async setDmPreferences(userId: string, prefs: Record<string, unknown>) {
    await this.setSetting(`dm_prefs:${userId}`, prefs);
    return { userId, dmPreferences: prefs };
  }

  // F-582: DM reactions
  async addDmReaction(userId: string, messageId: string, emoji: string) {
    const key = `dm_reactions:${messageId}`;
    const reactions = await this.getSetting<Array<{ userId: string; emoji: string }>>( key, []);
    const existing = reactions.find((r) => r.userId === userId);
    if (existing) existing.emoji = emoji; else reactions.push({ userId, emoji });
    await this.setSetting(key, reactions);
    return { messageId, userId, emoji };
  }

  // F-583: Group chat stub
  async createGroupChat(creatorId: string, participantIds: string[], title: string) {
    if (participantIds.length > 9) return { error: 'max_10_participants' };
    const chatId = `gc_${creatorId}_${Date.now()}`;
    const chat = { chatId, title, creatorId, participantIds: [creatorId, ...participantIds], createdAt: new Date().toISOString() };
    await this.setSetting(`group_chat:${chatId}`, chat);
    return { chat, note: 'real_time_requires_websocket' };
  }

  async getGroupChat(chatId: string) {
    const chat = await this.getSetting<Record<string, unknown>>(`group_chat:${chatId}`, null as unknown as Record<string, unknown>);
    if (!chat) return { chatId, error: 'not_found' };
    return { chat };
  }

  // F-585: Work recommendation via DM
  async sendWorkRecommendationDm(senderId: string, recipientId: string, workId: string, message?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { title: true, type: true } });
    if (!work) return { error: 'work_not_found' };
    return this.sendDm(senderId, recipientId, message ?? `Ich empfehle dir: "${work.title}"`, { type: 'WORK_RECOMMENDATION', workId });
  }

  // F-586: Public recommendation
  async createPublicRecommendation(userId: string, workId: string, comment?: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { title: true, artistId: true } });
    if (!work) return { error: 'work_not_found' };
    const rec = { userId, workId, comment, artistId: work.artistId, title: work.title, createdAt: new Date().toISOString() };
    const existing = await this.getSetting<Record<string, unknown>[]>(`public_recs:${userId}`, []);
    existing.unshift(rec);
    if (existing.length > 50) existing.pop();
    await this.setSetting(`public_recs:${userId}`, existing);
    return { recommendation: rec };
  }

  async getPublicRecommendations(userId: string) {
    const recs = await this.getSetting<Record<string, unknown>[]>(`public_recs:${userId}`, []);
    return { userId, recommendations: recs };
  }

  // F-587: Recommendation feed
  async getRecommendationFeed(userId: string) {
    const following = await this.prisma.follow.findMany({ where: { followerId: userId }, select: { artistId: true }, take: 50 });
    const friendIds = following.map((f) => f.artistId);
    const allRecs: Record<string, unknown>[] = [];
    for (const friendId of friendIds.slice(0, 10)) {
      const recs = await this.getSetting<Record<string, unknown>[]>(`public_recs:${friendId}`, []);
      allRecs.push(...recs.slice(0, 3));
    }
    return { userId, feed: allRecs.slice(0, 30) };
  }

  // F-588–590: Community playlists
  async getCommunityPlaylists() {
    const playlists = await this.prisma.playlist.findMany({ where: { isPublic: true }, take: 20, include: { user: { select: { displayName: true } }, items: { take: 5 } } });
    return { playlists };
  }

  async createCommunityPlaylist(userId: string, title: string, description?: string) {
    const playlist = await this.prisma.playlist.create({ data: { userId, title, description, isPublic: true } });
    return { playlist };
  }

  async voteAddWorkToPlaylist(userId: string, playlistId: string, workId: string) {
    const key = `playlist_votes:${playlistId}:${workId}`;
    const votes = await this.getSetting<string[]>(key, []);
    if (!votes.includes(userId)) votes.push(userId);
    await this.setSetting(key, votes);
    if (votes.length >= 3) {
      const exists = await this.prisma.playlistItem.findUnique({ where: { playlistId_workId: { playlistId, workId } } });
      if (!exists) {
        const count = await this.prisma.playlistItem.count({ where: { playlistId } });
        await this.prisma.playlistItem.create({ data: { playlistId, workId, position: count } });
        return { added: true, votes: votes.length };
      }
    }
    return { added: false, votes: votes.length, requiredVotes: 3 };
  }

  // F-591–594: Forum / discussion board (stubs - no Forum model)
  async getWorkDiscussions(workId: string) {
    const comments = await this.getSetting<Array<{ id: string; userId: string; body: string; upvotes: number; downvotes: number; solved: boolean; highlighted: boolean; createdAt: string }>>(
      `forum:${workId}`, []
    );
    return { workId, discussions: comments.filter((c) => !(c as { hidden?: boolean }).hidden) };
  }

  async createDiscussionPost(userId: string, workId: string, body: string) {
    const key = `forum:${workId}`;
    const posts = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const post = { id: `post_${userId}_${Date.now()}`, userId, body, upvotes: 0, downvotes: 0, solved: false, highlighted: false, hidden: false, createdAt: new Date().toISOString() };
    posts.unshift(post);
    await this.setSetting(key, posts);
    return { post };
  }

  async voteDiscussionPost(userId: string, workId: string, postId: string, vote: 'up' | 'down') {
    const key = `forum:${workId}`;
    const posts = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const post = posts.find((p) => p['id'] === postId);
    if (!post) return { error: 'post_not_found' };
    if (vote === 'up') post['upvotes'] = ((post['upvotes'] as number) ?? 0) + 1;
    else post['downvotes'] = ((post['downvotes'] as number) ?? 0) + 1;
    await this.setSetting(key, posts);
    return { postId, vote, upvotes: post['upvotes'], downvotes: post['downvotes'] };
  }

  async markDiscussionSolved(workId: string, postId: string) {
    const key = `forum:${workId}`;
    const posts = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const post = posts.find((p) => p['id'] === postId);
    if (post) { post['solved'] = true; await this.setSetting(key, posts); }
    return { postId, solved: true };
  }

  // F-595: Q&A section
  async getWorkQa(workId: string) {
    const qa = await this.getSetting<Array<{ question: string; answer: string | null; userId: string; createdAt: string }>>(`qa:${workId}`, []);
    return { workId, qa };
  }

  async submitQuestion(userId: string, workId: string, question: string) {
    const qa = await this.getSetting<Array<Record<string, unknown>>>(`qa:${workId}`, []);
    const item = { id: `qa_${userId}_${Date.now()}`, userId, question, answer: null, createdAt: new Date().toISOString() };
    qa.push(item);
    await this.setSetting(`qa:${workId}`, qa);
    return { item };
  }

  // F-596: Quiz stub
  async getWorkQuiz(workId: string) {
    const quiz = await this.getSetting<Record<string, unknown> | null>(`quiz:${workId}`, null);
    return { workId, quiz };
  }

  async createWorkQuiz(artistId: string, workId: string, questions: Array<{ question: string; options: string[]; correctIndex: number }>) {
    await this.setSetting(`quiz:${workId}`, { artistId, workId, questions, createdAt: new Date().toISOString() });
    return { workId, questionCount: questions.length };
  }

  // F-597–598: Book club
  async createBookClub(hostId: string, workId: string, title: string, schedule: string[]) {
    const clubId = `club_${hostId}_${workId}`;
    const club = { clubId, hostId, workId, title, schedule, members: [hostId], createdAt: new Date().toISOString() };
    await this.setSetting(`book_club:${clubId}`, club);
    return { club };
  }

  async getBookClub(clubId: string) {
    const club = await this.getSetting<Record<string, unknown>>(`book_club:${clubId}`, null as unknown as Record<string, unknown>);
    return { club };
  }

  async joinBookClub(userId: string, clubId: string) {
    const club = await this.getSetting<{ members: string[] }>(`book_club:${clubId}`, { members: [] });
    if (!club.members.includes(userId)) club.members.push(userId);
    await this.setSetting(`book_club:${clubId}`, club);
    return { userId, clubId, joined: true };
  }

  // F-599: Community events calendar
  async getCommunityEvents() {
    const events = await this.getSetting<Array<Record<string, unknown>>>('community_events', []);
    return { events };
  }

  async createCommunityEvent(organizerId: string, title: string, startsAt: string, description?: string) {
    const events = await this.getSetting<Array<Record<string, unknown>>>('community_events', []);
    const event = { id: `evt_${organizerId}_${Date.now()}`, organizerId, title, description, startsAt, attendees: [], createdAt: new Date().toISOString() };
    events.push(event);
    await this.setSetting('community_events', events);
    return { event };
  }

  // F-600: Virtual autograph
  async createVirtualAutograph(artistId: string, forUserId: string, message: string) {
    const autographId = `autograph_${artistId}_${forUserId}`;
    const autograph = { autographId, artistId, forUserId, message, createdAt: new Date().toISOString() };
    await this.setSetting(autographId, autograph);
    return { autograph };
  }

  // F-601: Fan wall
  async getFanWallMessages(artistId: string) {
    const messages = await this.getSetting<Array<{ userId: string; text: string; createdAt: string }>>(`fan_wall:${artistId}`, []);
    return { artistId, messages: messages.slice(-50) };
  }

  async addFanWallMessage(userId: string, artistId: string, text: string) {
    const messages = await this.getSetting<Array<{ userId: string; text: string; createdAt: string }>>(`fan_wall:${artistId}`, []);
    const msg = { userId, text, createdAt: new Date().toISOString() };
    messages.push(msg);
    if (messages.length > 100) messages.shift();
    await this.setSetting(`fan_wall:${artistId}`, messages);
    return { msg };
  }

  // F-602: Artist shoutout
  async createShoutout(artistId: string, targetUserId: string, message: string) {
    const shoutout = { artistId, targetUserId, message, createdAt: new Date().toISOString() };
    const existing = await this.getSetting<Array<Record<string, unknown>>>(`shoutouts:${targetUserId}`, []);
    existing.unshift(shoutout);
    await this.setSetting(`shoutouts:${targetUserId}`, existing);
    return { shoutout };
  }

  async getShoutouts(userId: string) {
    const shoutouts = await this.getSetting<Array<Record<string, unknown>>>(`shoutouts:${userId}`, []);
    return { userId, shoutouts };
  }

  // F-603: Weekly leaderboard
  async getWeeklyLeaderboard() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const loans = await this.prisma.loan.groupBy({ by: ['userId'], where: { createdAt: { gte: weekStart } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 });
    const leaderboard = await Promise.all(
      loans.map(async (entry, idx) => {
        const user = await this.prisma.user.findUnique({ where: { id: entry.userId }, select: { displayName: true, slug: true } });
        return { rank: idx + 1, userId: entry.userId, name: user?.displayName, slug: user?.slug, loansThisWeek: entry._count.id };
      })
    );
    return { period: weekStart.toISOString(), leaderboard };
  }

  // F-604: Weekly community challenge
  async getWeeklyChallenge() {
    const challenge = await this.getSetting<Record<string, unknown>>('weekly_challenge', { title: 'Hör 3 Werke diese Woche!', target: 3, type: 'LOAN_COUNT' });
    return { challenge };
  }

  async setWeeklyChallenge(challenge: Record<string, unknown>) {
    await this.setSetting('weekly_challenge', challenge);
    return { challenge };
  }

  // F-605–608: Feedback channels
  async submitFeatureRequest(userId: string, title: string, description: string) {
    const requests = await this.getSetting<Array<Record<string, unknown>>>('feature_requests', []);
    const request = { id: `fr_${userId}_${Date.now()}`, userId, title, description, votes: 0, status: 'OPEN', createdAt: new Date().toISOString() };
    requests.unshift(request);
    await this.setSetting('feature_requests', requests);
    return { request };
  }

  async getFeatureRequests() {
    const requests = await this.getSetting<Array<Record<string, unknown>>>('feature_requests', []);
    return { requests: requests.sort((a, b) => ((b['votes'] as number) ?? 0) - ((a['votes'] as number) ?? 0)) };
  }

  async voteFeatureRequest(userId: string, requestId: string) {
    const requests = await this.getSetting<Array<Record<string, unknown>>>('feature_requests', []);
    const req = requests.find((r) => r['id'] === requestId);
    if (!req) return { error: 'not_found' };
    req['votes'] = ((req['votes'] as number) ?? 0) + 1;
    await this.setSetting('feature_requests', requests);
    return { requestId, votes: req['votes'] };
  }

  async submitBugReport(userId: string, description: string, context: Record<string, unknown>) {
    const report = await this.prisma.report.create({ data: { reporterId: userId, targetType: 'Bug', targetId: 'system', reason: 'BUG_REPORT', description } });
    await this.setSetting(`bug_report_context:${report.id}`, context);
    return { reportId: report.id };
  }

  async submitSurveyResponse(userId: string, surveyType: string, responses: Record<string, unknown>) {
    await this.setSetting(`survey:${surveyType}:${userId}`, { responses, submittedAt: new Date().toISOString() });
    return { userId, surveyType, submitted: true };
  }

  // F-612–615: Live simulcast stub
  async createSimulcast(artistId: string, title: string, workId?: string) {
    const simulcastId = `live_${artistId}_${Date.now()}`;
    const simulcast = { simulcastId, artistId, title, workId, status: 'SCHEDULED', viewers: 0, createdAt: new Date().toISOString() };
    await this.setSetting(`simulcast:${simulcastId}`, simulcast);
    return { simulcast, streamKey: `rtmp_key_${simulcastId}`, note: 'live_streaming_requires_media_server' };
  }

  async getSimulcast(simulcastId: string) {
    const simulcast = await this.getSetting<Record<string, unknown>>(`simulcast:${simulcastId}`, null as unknown as Record<string, unknown>);
    return { simulcast };
  }

  async addSimulcastComment(userId: string, simulcastId: string, text: string) {
    const comments = await this.getSetting<Array<Record<string, unknown>>>(`simulcast_comments:${simulcastId}`, []);
    const comment = { userId, text, createdAt: new Date().toISOString() };
    comments.push(comment);
    if (comments.length > 500) comments.shift();
    await this.setSetting(`simulcast_comments:${simulcastId}`, comments);
    return { comment };
  }

  async sendSimulcastDonation(userId: string, simulcastId: string, amountCents: number, message?: string) {
    const donation = { userId, simulcastId, amountCents, message, createdAt: new Date().toISOString() };
    const donations = await this.getSetting<Array<Record<string, unknown>>>(`simulcast_donations:${simulcastId}`, []);
    donations.push(donation);
    await this.setSetting(`simulcast_donations:${simulcastId}`, donations);
    return { donation, note: 'payment_processing_requires_stripe_integration' };
  }

  // F-616: Artist ranking by follower growth
  async getArtistFollowerGrowthRanking() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newFollows = await this.prisma.follow.groupBy({ by: ['artistId'], where: { createdAt: { gte: weekAgo } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 20 });
    const ranking = await Promise.all(
      newFollows.map(async (f, idx) => {
        const artist = await this.prisma.user.findUnique({ where: { id: f.artistId }, select: { displayName: true, slug: true } });
        const totalFollowers = await this.prisma.follow.count({ where: { artistId: f.artistId } });
        return { rank: idx + 1, artistId: f.artistId, name: artist?.displayName, slug: artist?.slug, totalFollowers, newFollowersThisWeek: f._count.id };
      })
    );
    return { ranking };
  }

  // F-617: Most-quoted passages
  async getMostQuotedPassages(workId: string) {
    return { workId, passages: [], note: 'quote_aggregation_requires_client_tracking' };
  }

  // F-618: Trending topics tag cloud
  async getTrendingTagCloud() {
    const recentWorks = await this.prisma.work.findMany({ where: { status: 'PUBLISHED' }, select: { tags: true }, orderBy: { borrowCount: 'desc' }, take: 100 });
    const tagCounts = new Map<string, number>();
    for (const w of recentWorks) for (const tag of w.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    const sorted = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30);
    return { tags: sorted.map(([tag, count]) => ({ tag, count })) };
  }

  // F-619–621: Hashtag and mention system stubs
  async getHashtagFeed(hashtag: string) {
    return { hashtag, posts: [], note: 'hashtag_system_requires_post_model' };
  }

  async getMentionNotifications(userId: string) {
    const mentions = await this.prisma.notification.findMany({
      where: { userId, type: 'MENTION' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { userId, mentions };
  }

  // F-622: Community verification / trust points
  async getTrustPoints(userId: string) {
    const loans = await this.prisma.loan.count({ where: { userId } });
    const reviews = await this.prisma.review.count({ where: { userId } });
    const followers = await this.prisma.follow.count({ where: { artistId: userId } });
    const points = loans * 2 + reviews * 5 + followers;
    const tier = points >= 500 ? 'VERIFIED' : points >= 100 ? 'TRUSTED' : 'NEW';
    return { userId, trustPoints: points, tier };
  }

  // F-624: Community rules
  async getCommunityRules() {
    const rules = await this.getSetting<Array<{ id: number; title: string; body: string }>>('community_rules', [
      { id: 1, title: 'Respekt', body: 'Behandle andere mit Respekt.' },
      { id: 2, title: 'Keine Belästigung', body: 'Belästigung und Hate Speech sind verboten.' },
      { id: 3, title: 'Kein Spam', body: 'Keine Werbe- oder Spam-Inhalte.' },
      { id: 4, title: 'Spoiler kennzeichnen', body: 'Markiere Spoiler mit der Spoiler-Funktion.' },
    ]);
    return { rules };
  }

  // F-625–628: Anti-abuse
  async checkAntiSpam(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) return { error: 'user_not_found' };
    const ageMs = Date.now() - user.createdAt.getTime();
    const canPost = ageMs >= 15 * 60 * 1000;
    const isShadowBanned = await this.getSetting<boolean>(`shadow_banned:${userId}`, false);
    return { userId, canPost, isShadowBanned, accountAgeMinutes: Math.floor(ageMs / 60000) };
  }

  // F-629–630: Community newsletter
  async getCommunityNewsletterPreference(userId: string) {
    const optedIn = await this.getSetting<boolean>(`newsletter_community:${userId}`, false);
    return { userId, optedInCommunityNewsletter: optedIn };
  }

  async setCommunityNewsletterPreference(userId: string, optIn: boolean) {
    await this.setSetting(`newsletter_community:${userId}`, optIn);
    return { userId, optedInCommunityNewsletter: optIn };
  }

  // F-633: Community vote for year's best-of
  async getBestOfVoting(year: number) {
    const works = await this.prisma.work.findMany({
      where: { status: 'PUBLISHED', createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      select: { id: true, title: true, borrowCount: true },
      orderBy: { borrowCount: 'desc' },
      take: 20,
    });
    return { year, nominees: works };
  }

  async voteBestOf(userId: string, year: number, workId: string) {
    await this.setSetting(`best_of_vote:${year}:${userId}`, workId);
    return { userId, year, votedForWorkId: workId };
  }

  // F-634–636: Community programs
  async checkAlumniStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) return { error: 'not_found' };
    const daysOld = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return { userId, isAlumni: daysOld >= 365, daysSinceJoining: daysOld };
  }

  async getAmbassadorStatus(userId: string) {
    const loans = await this.prisma.loan.count({ where: { userId } });
    const followers = await this.prisma.follow.count({ where: { artistId: userId } });
    const isAmbassador = loans >= 100 || followers >= 500;
    return { userId, isAmbassador, loansCount: loans, followersCount: followers, requirements: { loans: 100, followers: 500 } };
  }

  // F-638: Content warning tags (community-maintained)
  async getContentWarningTags() {
    const tags = await this.getSetting<string[]>('content_warning_tags', ['violence', 'sexual_content', 'strong_language', 'disturbing_themes', 'drug_use', 'suicide_themes']);
    return { tags };
  }

  async addContentWarningTag(userId: string, workId: string, tag: string) {
    const key = `cw_tags:${workId}`;
    const existing = await this.getSetting<Array<{ userId: string; tag: string }>>( key, []);
    existing.push({ userId, tag });
    await this.setSetting(key, existing);
    return { workId, tag, submitted: true };
  }

  // F-639–640: Community transcripts/translations
  async getCommunityTranscriptSubmissions(workId: string) {
    const submissions = await this.getSetting<Array<Record<string, unknown>>>(`community_transcripts:${workId}`, []);
    return { workId, submissions };
  }

  async submitCommunityTranscript(userId: string, workId: string, transcript: string, language?: string) {
    const key = `community_transcripts:${workId}`;
    const submissions = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const submission = { id: `ct_${userId}_${Date.now()}`, userId, workId, transcript: transcript.slice(0, 50000), language: language ?? 'original', status: 'PENDING', createdAt: new Date().toISOString() };
    submissions.push(submission);
    await this.setSetting(key, submissions);
    return { submission };
  }

  async submitCommunityTranslation(userId: string, workId: string, language: string, translation: string) {
    const key = `community_translations:${workId}:${language}`;
    const submissions = await this.getSetting<Array<Record<string, unknown>>>(key, []);
    const submission = { id: `tl_${userId}_${Date.now()}`, userId, workId, language, translation: translation.slice(0, 50000), status: 'PENDING', createdAt: new Date().toISOString() };
    submissions.push(submission);
    await this.setSetting(key, submissions);
    return { submission };
  }
}
