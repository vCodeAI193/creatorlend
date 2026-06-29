import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
}
