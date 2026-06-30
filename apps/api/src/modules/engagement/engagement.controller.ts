import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { FavoritesService } from "./favorites.service";
import { FollowsService } from "./follows.service";
import { WishlistService } from "./wishlist.service";
import { RatingsService } from "./ratings.service";
import { ReviewsService } from "./reviews.service";
import { BookmarksService } from "./bookmarks.service";
import { FaqsService } from "./faqs.service";
import { ContentFeedbackService } from "./content-feedback.service";
import { RecommendationsService } from "./recommendations.service";
import { SocialStubsService } from "./social-stubs.service";
import { FavoriteDto } from "./dto/favorite.dto";
import { FollowDto } from "./dto/follow.dto";

/** Merkliste & Folgen (Hörer:innen). */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class EngagementController {
  constructor(
    private readonly favorites: FavoritesService,
    private readonly follows: FollowsService,
    private readonly wishlist: WishlistService,
    private readonly ratings: RatingsService,
    private readonly reviews: ReviewsService,
    private readonly bookmarks: BookmarksService,
    private readonly faqs: FaqsService,
    private readonly contentFeedback: ContentFeedbackService,
    private readonly recommendations: RecommendationsService,
    private readonly socialStubs: SocialStubsService,
  ) {}

  // POST /api/v1/favorites
  @Post("favorites")
  addFavorite(@CurrentUser() userId: string, @Body() body: FavoriteDto) {
    return this.favorites.add(userId, body.workId);
  }

  // DELETE /api/v1/favorites/:workId
  @Delete("favorites/:workId")
  removeFavorite(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.favorites.remove(userId, workId);
  }

  // GET /api/v1/favorites
  @Get("favorites")
  listFavorites(@CurrentUser() userId: string) {
    return this.favorites.list(userId);
  }

  // POST /api/v1/follows
  @Post("follows")
  follow(@CurrentUser() userId: string, @Body() body: FollowDto) {
    return this.follows.follow(userId, body.artistId);
  }

  // DELETE /api/v1/follows/:artistId
  @Delete("follows/:artistId")
  unfollow(@CurrentUser() userId: string, @Param("artistId") artistId: string) {
    return this.follows.unfollow(userId, artistId);
  }

  // GET /api/v1/follows
  @Get("follows")
  listFollows(@CurrentUser() userId: string) {
    return this.follows.list(userId);
  }

  // GET /api/v1/follows/feed – Aktivitäts-Feed gefolgter Künstler:innen (B-032)
  @Get("follows/feed")
  activityFeed(@CurrentUser() userId: string, @Query("limit") limit?: string) {
    return this.follows.activityFeed(userId, limit ? Number(limit) : 30);
  }

  // GET /api/v1/follows/growth – Follower-Wachstum (F-273) – ARTIST only via Roles override per route
  @Get("follows/growth")
  followerGrowth(@CurrentUser() userId: string) {
    return this.follows.followerGrowth(userId);
  }

  // POST /api/v1/follows/newsletter – Newsletter an Follower:innen (F-274)
  @Post("follows/newsletter")
  sendNewsletter(
    @CurrentUser() userId: string,
    @Body("subject") subject: string,
    @Body("body") body: string,
  ) {
    return this.follows.sendNewsletterToFollowers(userId, subject, body);
  }

  // POST /api/v1/wishlist – Werk zur Wunschliste hinzufügen (B-031)
  @Post("wishlist")
  addToWishlist(@CurrentUser() userId: string, @Body("workId") workId: string) {
    return this.wishlist.add(userId, workId);
  }

  // DELETE /api/v1/wishlist/:workId – aus Wunschliste entfernen (B-031)
  @Delete("wishlist/:workId")
  removeFromWishlist(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.wishlist.remove(userId, workId);
  }

  // GET /api/v1/wishlist – eigene Wunschliste (B-031)
  @Get("wishlist")
  getWishlist(@CurrentUser() userId: string) {
    return this.wishlist.list(userId);
  }

  // POST /api/v1/ratings – Werk bewerten (B-129)
  @Post("ratings")
  rate(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("value") value: number,
  ) {
    return this.ratings.upsert(userId, workId, value);
  }

  // DELETE /api/v1/ratings/:workId – Bewertung entfernen (B-129)
  @Delete("ratings/:workId")
  removeRating(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.ratings.remove(userId, workId);
  }

  // POST /api/v1/reviews – Rezension schreiben (B-130)
  @Post("reviews")
  review(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("body") body: string,
  ) {
    return this.reviews.upsert(userId, workId, body);
  }

  // DELETE /api/v1/reviews/:workId – eigene Rezension löschen (B-130)
  @Delete("reviews/:workId")
  removeReview(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.reviews.remove(userId, workId);
  }

  // POST /api/v1/bookmarks – Lesezeichen setzen (F-323)
  @Post("bookmarks")
  addBookmark(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("positionSeconds") positionSeconds: number,
    @Body("label") label?: string,
  ) {
    return this.bookmarks.add(userId, workId, positionSeconds, label);
  }

  // GET /api/v1/bookmarks – eigene Lesezeichen (F-323)
  @Get("bookmarks")
  listBookmarks(@CurrentUser() userId: string, @Query("workId") workId?: string) {
    return this.bookmarks.list(userId, workId);
  }

  // DELETE /api/v1/bookmarks/:id – Lesezeichen entfernen (F-323)
  @Delete("bookmarks/:id")
  removeBookmark(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.bookmarks.remove(userId, id);
  }

  // POST /api/v1/reviews/:id/reply – Künstler:in antwortet auf Rezension (F-601)
  @Post("reviews/:id/reply")
  addArtistReply(
    @CurrentUser() userId: string,
    @Param("id") reviewId: string,
    @Body("reply") reply: string,
  ) {
    return this.reviews.addArtistReply(userId, reviewId, reply);
  }

  // POST /api/v1/reviews/:id/vote – Rezension bewerten (F-602)
  @Post("reviews/:id/vote")
  voteReview(
    @CurrentUser() userId: string,
    @Param("id") reviewId: string,
    @Body("helpful") helpful: boolean,
  ) {
    return this.reviews.voteReview(userId, reviewId, helpful);
  }

  // GET /api/v1/reviews/:id – Rezension mit Votes (F-602)
  @Get("reviews/:id")
  getReview(@Param("id") reviewId: string) {
    return this.reviews.getReviewWithVotes(reviewId);
  }

  // GET /api/v1/faqs/:artistId – FAQs eines Künstlers (F-603)
  @Get("faqs/:artistId")
  listFaqs(@Param("artistId") artistId: string) {
    return this.faqs.list(artistId);
  }

  // POST /api/v1/faqs – FAQ erstellen (F-603)
  @Post("faqs")
  createFaq(
    @CurrentUser() userId: string,
    @Body("question") question: string,
    @Body("answer") answer?: string,
  ) {
    return this.faqs.create(userId, question, answer);
  }

  // PATCH /api/v1/faqs/:id – FAQ aktualisieren (F-603)
  @Patch("faqs/:id")
  updateFaq(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: { question?: string; answer?: string; sortOrder?: number },
  ) {
    return this.faqs.update(userId, id, body);
  }

  // DELETE /api/v1/faqs/:id – FAQ löschen (F-603)
  @Delete("faqs/:id")
  deleteFaq(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.faqs.delete(userId, id);
  }

  // POST /api/v1/faqs/reorder – FAQs neu ordnen (F-603)
  @Post("faqs/reorder")
  reorderFaqs(@CurrentUser() userId: string, @Body("orderedIds") orderedIds: string[]) {
    return this.faqs.reorder(userId, orderedIds);
  }

  // ─── F-536/F-537/F-538: Content Feedback ────────────────────────────────

  // POST /api/v1/content-feedback/not-interested – Werk nicht interessiert markieren (F-536)
  @Post("content-feedback/not-interested")
  notInterested(@CurrentUser() userId: string, @Body("workId") workId: string) {
    return this.contentFeedback.notInterested(userId, workId);
  }

  // DELETE /api/v1/content-feedback/not-interested/:workId – Markierung aufheben (F-536)
  @Delete("content-feedback/not-interested/:workId")
  removeNotInterested(@CurrentUser() userId: string, @Param("workId") workId: string) {
    return this.contentFeedback.removeNotInterested(userId, workId);
  }

  // POST /api/v1/content-feedback/more-like-this – Mehr davon (F-537)
  @Post("content-feedback/more-like-this")
  moreLikeThis(@CurrentUser() userId: string, @Body("workId") workId: string) {
    return this.contentFeedback.moreLikeThis(userId, workId);
  }

  // POST /api/v1/content-feedback/mood-vote – Stimmungs-Votum nach dem Hören (F-538)
  @Post("content-feedback/mood-vote")
  moodVote(
    @CurrentUser() userId: string,
    @Body("loanId") loanId: string,
    @Body("mood") mood: 'UP' | 'DOWN',
  ) {
    return this.contentFeedback.voteMood(userId, loanId, mood);
  }

  // GET /api/v1/content-feedback – eigene Feedbacks (F-536/F-537/F-538)
  @Get("content-feedback")
  getMyFeedback(@CurrentUser() userId: string) {
    return this.contentFeedback.getFeedback(userId);
  }

  // ─── F-571-F-576: Social / Activity Feed ────────────────────────────────

  // GET /api/v1/follows/public-feed – öffentlicher Aktivitäts-Feed (F-571)
  @Get("follows/public-feed")
  publicActivityFeed(@CurrentUser() userId: string, @Query("limit") limit?: string) {
    return this.follows.publicActivityFeed(userId, limit ? Number(limit) : 20);
  }

  // GET /api/v1/follows/:artistId/followers – Follower-Liste eines Künstlers (F-575)
  @Get("follows/:artistId/followers")
  listFollowers(
    @CurrentUser() userId: string,
    @Param("artistId") artistId: string,
  ) {
    return this.follows.listFollowersWithMutual(artistId, userId);
  }

  // GET /api/v1/follows/:artistId/followers/search – Follower suchen (F-576)
  @Get("follows/:artistId/followers/search")
  searchFollowers(@Param("artistId") artistId: string, @Query("q") q: string) {
    return this.follows.searchFollowers(artistId, q ?? '');
  }

  // PATCH /api/v1/follows/privacy/activity-feed – Feed-Sichtbarkeit (F-572)
  @Patch("follows/privacy/activity-feed")
  setActivityFeedPublic(@CurrentUser() userId: string, @Body("public") isPublic: boolean) {
    return this.follows.setActivityFeedPublic(userId, isPublic);
  }

  // PATCH /api/v1/follows/privacy/follower-list – Follower-Listen-Sichtbarkeit (F-575)
  @Patch("follows/privacy/follower-list")
  setFollowerListPublic(@CurrentUser() userId: string, @Body("public") isPublic: boolean) {
    return this.follows.setFollowerListPublic(userId, isPublic);
  }

  // ─── F-521: One-Tap-Stern-Bewertung ─────────────────────────────────────

  // POST /api/v1/ratings/one-tap – Direkt-Bewertung aus Leihe heraus (F-521)
  @Post("ratings/one-tap")
  oneTapRate(
    @CurrentUser() userId: string,
    @Body("loanId") loanId: string,
    @Body("value") value: number,
  ) {
    return this.ratings.oneTapRate(userId, loanId, value);
  }

  // ─── F-585/F-586/F-587: Werk-Empfehlungen ────────────────────────────────

  // GET /api/v1/recommendations/feed – Empfehlungs-Feed (F-587)
  @Get("recommendations/feed")
  getRecommendationFeed(@CurrentUser() userId: string, @Query("limit") limit?: string) {
    return this.recommendations.getFeed(userId, limit ? Number(limit) : 20);
  }

  // GET /api/v1/recommendations/user/:userId – Empfehlungen eines Nutzers
  @Get("recommendations/user/:userId")
  listUserRecommendations(@Param("userId") userId: string) {
    return this.recommendations.listByUser(userId);
  }

  // POST /api/v1/recommendations – Werk öffentlich empfehlen (F-586)
  @Post("recommendations")
  recommend(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("comment") comment?: string,
  ) {
    return this.recommendations.recommend(userId, workId, comment);
  }

  // POST /api/v1/recommendations/dm – Werk per DM empfehlen (F-585)
  @Post("recommendations/dm")
  recommendViaDm(
    @CurrentUser() userId: string,
    @Body("recipientId") recipientId: string,
    @Body("workId") workId: string,
    @Body("comment") comment?: string,
  ) {
    return this.recommendations.recommendViaDm(userId, recipientId, workId, comment);
  }

  // DELETE /api/v1/recommendations/:id – Empfehlung löschen
  @Delete("recommendations/:id")
  removeRecommendation(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.recommendations.remove(userId, id);
  }

  // ─── F-571–572: Activity Feed ────────────────────────────────────────────

  @Get("activity-feed")
  getActivityFeed(@CurrentUser() userId: string) {
    return this.socialStubs.getActivityFeed(userId);
  }

  @Get("activity-feed/privacy")
  getActivityFeedPrivacy(@CurrentUser() userId: string) {
    return this.socialStubs.getActivityFeedPrivacy(userId);
  }

  @Put("activity-feed/privacy")
  setActivityFeedPrivacy(@CurrentUser() userId: string, @Body("isPublic") isPublic: boolean) {
    return this.socialStubs.setActivityFeedPrivacy(userId, isPublic);
  }

  // F-573: Friend recommendations
  @Get("friend-recommendations")
  getFriendRecommendations(@CurrentUser() userId: string) {
    return this.socialStubs.getFriendRecommendations(userId);
  }

  // F-574: Mutual follow
  @Get("mutual-follow/:targetId")
  getMutualFollowStatus(@CurrentUser() userId: string, @Param("targetId") targetId: string) {
    return this.socialStubs.getMutualFollowStatus(userId, targetId);
  }

  // F-575: Follower list visibility
  @Get("follower-list/visibility")
  getFollowerListVisibility(@CurrentUser() userId: string) {
    return this.socialStubs.getFollowerListVisibility(userId);
  }

  @Put("follower-list/visibility")
  setFollowerListVisibility(@CurrentUser() userId: string, @Body("isPublic") isPublic: boolean) {
    return this.socialStubs.setFollowerListVisibility(userId, isPublic);
  }

  // F-576: Follower search (social stubs variant)
  @Get("followers/search-by-name")
  searchFollowersByName(@CurrentUser() userId: string, @Query("q") q: string) {
    return this.socialStubs.searchFollowers(userId, q ?? '');
  }

  // F-577: Block user
  @Post("block/:blockedId")
  blockUser(@CurrentUser() userId: string, @Param("blockedId") blockedId: string) {
    return this.socialStubs.blockUser(userId, blockedId);
  }

  // F-578: Blocklist
  @Get("blocklist")
  getBlocklist(@CurrentUser() userId: string) {
    return this.socialStubs.getBlocklist(userId);
  }

  @Delete("block/:blockedId")
  unblockUser(@CurrentUser() userId: string, @Param("blockedId") blockedId: string) {
    return this.socialStubs.unblockUser(userId, blockedId);
  }

  // F-579: Report user
  @Post("report/user/:targetId")
  reportUser(
    @CurrentUser() userId: string,
    @Param("targetId") targetId: string,
    @Body("reason") reason: string,
    @Body("description") description: string,
  ) {
    return this.socialStubs.reportUser(userId, targetId, reason, description);
  }

  // F-580: DM inbox
  @Get("dm/inbox")
  getDmInbox(@CurrentUser() userId: string) {
    return this.socialStubs.getDmInbox(userId);
  }

  @Get("dm/:otherId")
  getDmConversation(@CurrentUser() userId: string, @Param("otherId") otherId: string) {
    return this.socialStubs.getDmConversation(userId, otherId);
  }

  @Post("dm/:recipientId")
  sendDm(
    @CurrentUser() userId: string,
    @Param("recipientId") recipientId: string,
    @Body("body") body: string,
  ) {
    return this.socialStubs.sendDm(userId, recipientId, body);
  }

  // F-581: DM preferences
  @Get("dm/preferences")
  getDmPreferences(@CurrentUser() userId: string) {
    return this.socialStubs.getDmPreferences(userId);
  }

  @Put("dm/preferences")
  setDmPreferences(@CurrentUser() userId: string, @Body() prefs: Record<string, unknown>) {
    return this.socialStubs.setDmPreferences(userId, prefs);
  }

  // F-582: DM reactions
  @Post("dm/message/:messageId/reaction")
  addDmReaction(
    @CurrentUser() userId: string,
    @Param("messageId") messageId: string,
    @Body("emoji") emoji: string,
  ) {
    return this.socialStubs.addDmReaction(userId, messageId, emoji);
  }

  // F-583: Group chat
  @Post("group-chat")
  createGroupChat(
    @CurrentUser() userId: string,
    @Body("participantIds") participantIds: string[],
    @Body("title") title: string,
  ) {
    return this.socialStubs.createGroupChat(userId, participantIds, title);
  }

  @Get("group-chat/:chatId")
  getGroupChat(@Param("chatId") chatId: string) {
    return this.socialStubs.getGroupChat(chatId);
  }

  // F-585: Work recommendation via DM
  @Post("dm/:recipientId/recommend-work")
  sendWorkRecommendationDm(
    @CurrentUser() userId: string,
    @Param("recipientId") recipientId: string,
    @Body("workId") workId: string,
    @Body("message") message: string,
  ) {
    return this.socialStubs.sendWorkRecommendationDm(userId, recipientId, workId, message);
  }

  // F-586–587: Public recommendations
  @Post("public-recommendations/:workId")
  createPublicRecommendation(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("comment") comment: string,
  ) {
    return this.socialStubs.createPublicRecommendation(userId, workId, comment);
  }

  @Get("public-recommendations/:userId")
  getPublicRecommendations(@Param("userId") userId: string) {
    return this.socialStubs.getPublicRecommendations(userId);
  }

  @Get("recommendation-feed/social")
  getSocialRecommendationFeed(@CurrentUser() userId: string) {
    return this.socialStubs.getRecommendationFeed(userId);
  }

  // F-588–590: Community playlists
  @Get("community-playlists")
  getCommunityPlaylists() {
    return this.socialStubs.getCommunityPlaylists();
  }

  @Post("community-playlists")
  createCommunityPlaylist(
    @CurrentUser() userId: string,
    @Body("title") title: string,
    @Body("description") description: string,
  ) {
    return this.socialStubs.createCommunityPlaylist(userId, title, description);
  }

  @Post("community-playlists/:playlistId/vote/:workId")
  voteAddWorkToPlaylist(
    @CurrentUser() userId: string,
    @Param("playlistId") playlistId: string,
    @Param("workId") workId: string,
  ) {
    return this.socialStubs.voteAddWorkToPlaylist(userId, playlistId, workId);
  }

  // F-591–594: Forum / discussions
  @Get("discussions/:workId")
  getWorkDiscussions(@Param("workId") workId: string) {
    return this.socialStubs.getWorkDiscussions(workId);
  }

  @Post("discussions/:workId")
  createDiscussionPost(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("body") body: string,
  ) {
    return this.socialStubs.createDiscussionPost(userId, workId, body);
  }

  @Post("discussions/:workId/:postId/vote")
  voteDiscussionPost(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Param("postId") postId: string,
    @Body("vote") vote: 'up' | 'down',
  ) {
    return this.socialStubs.voteDiscussionPost(userId, workId, postId, vote);
  }

  @Post("discussions/:workId/:postId/solve")
  markDiscussionSolved(@Param("workId") workId: string, @Param("postId") postId: string) {
    return this.socialStubs.markDiscussionSolved(workId, postId);
  }

  // F-595–596: Q&A and Quiz
  @Get("qa/:workId")
  getWorkQa(@Param("workId") workId: string) {
    return this.socialStubs.getWorkQa(workId);
  }

  @Post("qa/:workId")
  submitQuestion(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("question") question: string,
  ) {
    return this.socialStubs.submitQuestion(userId, workId, question);
  }

  @Get("quiz/:workId")
  getWorkQuiz(@Param("workId") workId: string) {
    return this.socialStubs.getWorkQuiz(workId);
  }

  // F-597–598: Book clubs
  @Post("book-clubs")
  createBookClub(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("title") title: string,
    @Body("schedule") schedule: string[],
  ) {
    return this.socialStubs.createBookClub(userId, workId, title, schedule);
  }

  @Get("book-clubs/:clubId")
  getBookClub(@Param("clubId") clubId: string) {
    return this.socialStubs.getBookClub(clubId);
  }

  @Post("book-clubs/:clubId/join")
  joinBookClub(@CurrentUser() userId: string, @Param("clubId") clubId: string) {
    return this.socialStubs.joinBookClub(userId, clubId);
  }

  // F-599: Community events
  @Get("community-events")
  getCommunityEvents() {
    return this.socialStubs.getCommunityEvents();
  }

  @Post("community-events")
  createCommunityEvent(
    @CurrentUser() userId: string,
    @Body("title") title: string,
    @Body("startsAt") startsAt: string,
    @Body("description") description: string,
  ) {
    return this.socialStubs.createCommunityEvent(userId, title, startsAt, description);
  }

  // F-600: Virtual autograph
  @Post("autograph/:forUserId")
  createVirtualAutograph(
    @CurrentUser() userId: string,
    @Param("forUserId") forUserId: string,
    @Body("message") message: string,
  ) {
    return this.socialStubs.createVirtualAutograph(userId, forUserId, message);
  }

  // F-601–602: Fan wall and shoutouts
  @Get("fan-wall/:artistId")
  getFanWallMessages(@Param("artistId") artistId: string) {
    return this.socialStubs.getFanWallMessages(artistId);
  }

  @Post("fan-wall/:artistId")
  addFanWallMessage(
    @CurrentUser() userId: string,
    @Param("artistId") artistId: string,
    @Body("text") text: string,
  ) {
    return this.socialStubs.addFanWallMessage(userId, artistId, text);
  }

  @Get("shoutouts")
  getShoutouts(@CurrentUser() userId: string) {
    return this.socialStubs.getShoutouts(userId);
  }

  // F-603–604: Leaderboard and weekly challenge
  @Get("leaderboard/weekly")
  getWeeklyLeaderboard() {
    return this.socialStubs.getWeeklyLeaderboard();
  }

  @Get("community-challenge")
  getWeeklyChallenge() {
    return this.socialStubs.getWeeklyChallenge();
  }

  // F-605–608: Feedback channels
  @Get("feature-requests")
  getFeatureRequests() {
    return this.socialStubs.getFeatureRequests();
  }

  @Post("feature-requests")
  submitFeatureRequest(
    @CurrentUser() userId: string,
    @Body("title") title: string,
    @Body("description") description: string,
  ) {
    return this.socialStubs.submitFeatureRequest(userId, title, description);
  }

  @Post("feature-requests/:requestId/vote")
  voteFeatureRequest(@CurrentUser() userId: string, @Param("requestId") requestId: string) {
    return this.socialStubs.voteFeatureRequest(userId, requestId);
  }

  @Post("bug-reports")
  submitBugReport(
    @CurrentUser() userId: string,
    @Body("description") description: string,
    @Body("context") context: Record<string, unknown>,
  ) {
    return this.socialStubs.submitBugReport(userId, description, context);
  }

  @Post("surveys/:surveyType")
  submitSurveyResponse(
    @CurrentUser() userId: string,
    @Param("surveyType") surveyType: string,
    @Body() responses: Record<string, unknown>,
  ) {
    return this.socialStubs.submitSurveyResponse(userId, surveyType, responses);
  }

  // F-612–615: Live simulcast
  @Get("simulcast/:simulcastId")
  getSimulcast(@Param("simulcastId") simulcastId: string) {
    return this.socialStubs.getSimulcast(simulcastId);
  }

  @Post("simulcast/:simulcastId/comments")
  addSimulcastComment(
    @CurrentUser() userId: string,
    @Param("simulcastId") simulcastId: string,
    @Body("text") text: string,
  ) {
    return this.socialStubs.addSimulcastComment(userId, simulcastId, text);
  }

  @Post("simulcast/:simulcastId/donate")
  sendSimulcastDonation(
    @CurrentUser() userId: string,
    @Param("simulcastId") simulcastId: string,
    @Body("amountCents") amountCents: number,
    @Body("message") message: string,
  ) {
    return this.socialStubs.sendSimulcastDonation(userId, simulcastId, amountCents, message);
  }

  // F-616–620: Rankings and trends
  @Get("rankings/artist-growth")
  getArtistFollowerGrowthRanking() {
    return this.socialStubs.getArtistFollowerGrowthRanking();
  }

  @Get("trending/tags")
  getTrendingTagCloud() {
    return this.socialStubs.getTrendingTagCloud();
  }

  @Get("hashtag/:hashtag")
  getHashtagFeed(@Param("hashtag") hashtag: string) {
    return this.socialStubs.getHashtagFeed(hashtag);
  }

  @Get("mentions")
  getMentionNotifications(@CurrentUser() userId: string) {
    return this.socialStubs.getMentionNotifications(userId);
  }

  // F-622: Trust points
  @Get("trust-points/:userId")
  getTrustPoints(@Param("userId") userId: string) {
    return this.socialStubs.getTrustPoints(userId);
  }

  // F-624: Community rules
  @Get("community-rules")
  getCommunityRules() {
    return this.socialStubs.getCommunityRules();
  }

  // F-625–628: Anti-abuse
  @Get("anti-spam/check")
  checkAntiSpam(@CurrentUser() userId: string) {
    return this.socialStubs.checkAntiSpam(userId);
  }

  // F-629–630: Newsletter opt-in
  @Get("newsletter/community/preference")
  getCommunityNewsletterPreference(@CurrentUser() userId: string) {
    return this.socialStubs.getCommunityNewsletterPreference(userId);
  }

  @Put("newsletter/community/preference")
  setCommunityNewsletterPreference(@CurrentUser() userId: string, @Body("optIn") optIn: boolean) {
    return this.socialStubs.setCommunityNewsletterPreference(userId, optIn);
  }

  // F-633–635: Community programs
  @Get("best-of/:year")
  getBestOfVoting(@Param("year") year: string) {
    return this.socialStubs.getBestOfVoting(parseInt(year, 10));
  }

  @Post("best-of/:year/vote")
  voteBestOf(
    @CurrentUser() userId: string,
    @Param("year") year: string,
    @Body("workId") workId: string,
  ) {
    return this.socialStubs.voteBestOf(userId, parseInt(year, 10), workId);
  }

  @Get("alumni-status")
  checkAlumniStatus(@CurrentUser() userId: string) {
    return this.socialStubs.checkAlumniStatus(userId);
  }

  @Get("ambassador-status")
  getAmbassadorStatus(@CurrentUser() userId: string) {
    return this.socialStubs.getAmbassadorStatus(userId);
  }

  // F-638–640: Community content
  @Get("content-warning-tags")
  getContentWarningTags() {
    return this.socialStubs.getContentWarningTags();
  }

  @Post("content-warning-tags/:workId")
  addContentWarningTag(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("tag") tag: string,
  ) {
    return this.socialStubs.addContentWarningTag(userId, workId, tag);
  }

  @Get("community-transcripts/:workId")
  getCommunityTranscriptSubmissions(@Param("workId") workId: string) {
    return this.socialStubs.getCommunityTranscriptSubmissions(workId);
  }

  @Post("community-transcripts/:workId")
  submitCommunityTranscript(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("transcript") transcript: string,
    @Body("language") language: string,
  ) {
    return this.socialStubs.submitCommunityTranscript(userId, workId, transcript, language);
  }

  @Post("community-translations/:workId")
  submitCommunityTranslation(
    @CurrentUser() userId: string,
    @Param("workId") workId: string,
    @Body("language") language: string,
    @Body("translation") translation: string,
  ) {
    return this.socialStubs.submitCommunityTranslation(userId, workId, language, translation);
  }
}
