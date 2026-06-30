import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { WorksService } from "./works.service";
import { ChapterMarksService } from "./chapter-marks.service";
import { TranscriptsService } from "./transcripts.service";
import { RatingsService } from "../engagement/ratings.service";
import { ReviewsService } from "../engagement/reviews.service";
import { SubtitlesService } from "./subtitles.service";
import { LyricsService } from "./lyrics.service";
import { WorkTranslationsService } from "./translations.service";
import { CollectionsService } from "./collections.service";
import { AiService } from "./ai.service";
import { GeoService } from "./geo.service";
import { AutoTranslateService } from "./auto-translate.service";
import { DiscountCodesService } from "./discount-codes.service";
import { CategoriesService } from "./categories.service";
import { UtmService } from "./utm.service";
import { WorksStubsService } from "./works-stubs.service";
import { CreateWorkDto } from "./dto/create-work.dto";
import { UpdateWorkDto } from "./dto/update-work.dto";

@ApiTags("works")
@Controller("works")
export class WorksController {
  constructor(
    private readonly works: WorksService,
    private readonly chapters: ChapterMarksService,
    private readonly transcripts: TranscriptsService,
    private readonly ratings: RatingsService,
    private readonly reviews: ReviewsService,
    private readonly subtitles: SubtitlesService,
    private readonly lyrics: LyricsService,
    private readonly translations: WorkTranslationsService,
    private readonly collections: CollectionsService,
    private readonly ai: AiService,
    private readonly geo: GeoService,
    private readonly autoTranslate: AutoTranslateService,
    private readonly discountCodes: DiscountCodesService,
    private readonly utm: UtmService,
    private readonly categories: CategoriesService,
    private readonly stubs: WorksStubsService,
  ) {}

  // POST /api/v1/works – Werk einstellen (ARTIST)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  create(@CurrentUser() userId: string, @Body() body: CreateWorkDto) {
    return this.works.create(userId, body);
  }

  // PATCH /api/v1/works/:id – Metadaten ändern (Eigentümer)
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  update(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: UpdateWorkDto,
  ) {
    return this.works.update(userId, id, body);
  }

  // POST /api/v1/works/:id/publish – veröffentlichen (ARTIST)
  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  publish(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.publish(userId, id);
  }

  // POST /api/v1/works/:id/unpublish – depublizieren/archivieren (ARTIST, B-041)
  @Post(":id/unpublish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  unpublish(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.unpublish(userId, id);
  }

  // POST /api/v1/works/:id/archive – Werk archivieren (ARTIST)
  @Post(":id/archive")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  archive(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.archive(userId, id);
  }

  // POST /api/v1/works/:id/restore – Werk wiederherstellen (ARTIST)
  @Post(":id/restore")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  restore(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.restore(userId, id);
  }

  // POST /api/v1/works/:id/clone – Werk klonen (ARTIST)
  @Post(":id/clone")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  clone(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.clone(userId, id);
  }

  // DELETE /api/v1/works/:id – Soft-Delete (ARTIST, F-098)
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  softDelete(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.softDelete(userId, id);
  }

  // POST /api/v1/works/:id/recover – gelöschtes Werk wiederherstellen (ARTIST, F-098)
  @Post(":id/recover")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  recover(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.restoreDeleted(userId, id);
  }

  // PATCH /api/v1/works/:id/metadata – Metadaten-Felder aktualisieren (ARTIST, F-111..F-116)
  @Patch(":id/metadata")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  updateMetadata(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body()
    body: {
      licenseType?: string;
      embargoUntil?: string | null;
      geoBlock?: string[];
      ageRating?: string;
      contentWarnings?: string[];
      isExclusive?: boolean;
      isbn?: string;
      isrc?: string;
    },
  ) {
    return this.works.updateMetadata(userId, id, body);
  }

  // GET /api/v1/works/charts – Top-Charts (F-216)
  @Get('charts')
  getTopCharts(
    @Query('period') period: '7d' | '30d' | '365d' = '7d',
    @Query('limit') limit?: string,
  ) {
    return this.works.getTopCharts(period, limit ? Number(limit) : 20);
  }

  // GET /api/v1/works/new – Neu auf CreatorLend (F-222)
  @Get('new')
  newArrivals(@Query('limit') limit?: string) {
    return this.works.getNewArrivals(limit ? Number(limit) : 20);
  }

  // GET /api/v1/works/search/suggest – Autocomplete-Vorschläge (F-183/F-184)
  @Get('search/suggest')
  searchSuggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.works.searchSuggestions(q ?? '', limit ? Number(limit) : 10);
  }

  // GET /api/v1/works/rss/:artistId – RSS-Feed eines Künstlers (F-137)
  @Get("rss/:artistId")
  @Header("Content-Type", "application/rss+xml")
  async rssFeedByArtistId(@Param("artistId") artistId: string, @Res() res?: any) {
    const feed = await this.works.getRssFeed(artistId);
    if (res) {
      res.setHeader("Content-Type", "application/rss+xml");
      res.send(feed);
      return;
    }
    return feed;
  }

  // GET /api/v1/works/random – zufälliges Werk (F-201/F-202)
  @Get("random")
  random(@Query("type") type?: string, @Query("language") language?: string) {
    return this.works.getRandomWork(type, language);
  }

  // GET /api/v1/works/random/many – mehrere zufällige Werke (F-201/F-202)
  @Get("random/many")
  randomMany(
    @Query("count") count?: string,
    @Query("type") type?: string,
    @Query("language") language?: string,
  ) {
    return this.works.getRandomWorks(count ? Number(count) : 5, type, language);
  }

  // GET /api/v1/works/export – Metadaten-Export (F-093, F-140)
  @Get("export")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async exportMetadata(
    @CurrentUser() userId: string,
    @Query("format") format: "json" | "csv" = "json",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res() res?: any,
  ) {
    const data = await this.works.exportMetadata(userId, format);
    if (format === "csv" && res) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="works.csv"');
      res.send(data);
      return;
    }
    return data;
  }

  // GET /api/v1/works – Suche / Discovery mit Facetten (F-581/F-582/F-195)
  @Get()
  search(
    @Query("type") type?: string,
    @Query("q") q?: string,
    @Query("language") language?: string,
    @Query("category") category?: string,
    @Query("sort") sort?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("minDuration") minDuration?: string,
    @Query("maxDuration") maxDuration?: string,
    @Query("explicit") explicit?: string,
    @Query("tags") tags?: string, // comma-separated
    @Query("facets") facets?: string, // if "true", return facets
    @Query("followedOnly") followedOnly?: string, // F-195
    @CurrentUser() userId?: string,
  ) {
    const filter = {
      type,
      q,
      language,
      category,
      sort,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      minDuration: minDuration !== undefined ? Number(minDuration) : undefined,
      maxDuration: maxDuration !== undefined ? Number(maxDuration) : undefined,
      explicit: explicit !== undefined ? explicit === "true" : undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      followedOnly: followedOnly === "true",
      userId,
    };
    if (facets === "true" || q?.includes(":")) {
      return this.works.searchWithFacets(filter);
    }
    return this.works.search(filter);
  }

  // GET /api/v1/works/performance – Performance-Tabelle (F-452)
  @Get("performance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  getPerformanceTable(@CurrentUser() userId: string) {
    return this.works.getPerformanceTable(userId);
  }

  // GET /api/v1/works/trending – Top-20 in den letzten 7 Tagen (B-063)
  @Get("trending")
  trending(@Query("limit") limit?: string) {
    return this.works.trending(limit ? Number(limit) : 20);
  }

  // GET /api/v1/works/newcomers – Newcomer-Charts (F-217)
  @Get("newcomers")
  newcomerCharts(@Query("limit") limit?: string) {
    return this.works.getNewcomerCharts(limit ? Number(limit) : 20);
  }

  // GET /api/v1/works/tag-cloud – Trending-Tag-Cloud (F-618)
  @Get("tag-cloud")
  getTagCloud(@Query("limit") limit?: string) {
    return this.works.getTagCloud(limit ? Number(limit) : 50);
  }

  // GET /api/v1/works/price-recommendation – Preisempfehlung für WorkType (F-376)
  @Get("price-recommendation")
  getPriceRecommendation(@Query("type") type = 'AUDIOBOOK') {
    return this.works.getPriceRecommendation(type);
  }

  // GET /api/v1/wishlist/:slug – öffentliche Wunschliste (F-241/F-242)
  @Get("/wishlist/:slug")
  publicWishlist(@Param("slug") slug: string) {
    return this.works.getPublicWishlist(slug);
  }

  // GET /api/v1/works/recommendations – Personalisierte Empfehlungen
  @Get("recommendations")
  @UseGuards(JwtAuthGuard)
  recommendations(@CurrentUser() userId: string, @Query("limit") limit?: string) {
    return this.works.recommendations(userId, limit ? Number(limit) : 20);
  }

  // GET /api/v1/works/artist/:artistId/feed.rss – RSS-Feed eines Künstlers
  @Get("artist/:artistId/feed.rss")
  async rssFeed(
    @Param("artistId") artistId: string,
    @Query("limit") limit?: string,
    @Res() res?: any,
  ) {
    const artist = await this.works.getArtistForFeed(artistId);
    const works = await this.works.listByArtist(artistId, "PUBLISHED", limit ? Number(limit) : 50);
    const items = (works as Array<{ id: string; title: string; description: string | null; createdAt: Date; type: string }>)
      .map(
        (w) =>
          `<item><title>${w.title}</title><description>${w.description ?? ""}</description><pubDate>${w.createdAt.toUTCString()}</pubDate><link>/works/${w.id}</link></item>`,
      )
      .join("\n");
    const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${(artist as { displayName: string } | null)?.displayName ?? artistId}</title><link>/users/${artistId}/profile</link>${items}</channel></rss>`;
    if (res) {
      res.setHeader("Content-Type", "application/rss+xml");
      res.send(feed);
    }
    return feed;
  }

  // GET /api/v1/works/categories – Kategorien auflisten (F-146/F-147)
  @Get("categories")
  listCategories() {
    return this.categories.listCategories();
  }

  // POST /api/v1/works/suggest-tags – Tag-Vorschläge (F-144)
  @Post("suggest-tags")
  @UseGuards(JwtAuthGuard)
  suggestTags(@Body("title") title: string, @Body("description") description: string) {
    return this.works.suggestTags(title, description);
  }

  // GET /api/v1/works/featured – Featured works (F-133)
  @Get("featured")
  getFeaturedWorks() {
    return this.works.getFeaturedWorks();
  }

  // GET /api/v1/works/:id/qr – QR-Code-URL für das Werk (F-140)
  @Get(":id/qr")
  getQrCode(@Param("id") id: string) {
    return this.works.getWorkQrCode(id);
  }

  // GET /api/v1/works/:id/summary – KI-Zusammenfassung (F-997, Stub)
  @Get(":id/summary")
  getSummary(@Param("id") id: string) {
    return this.ai.summarize(id);
  }

  // GET /api/v1/works/:id/critique – KI-Kritik (F-998, Stub)
  @Get(":id/critique")
  getCritique(@Param("id") id: string) {
    return this.ai.critique(id);
  }

  // GET /api/v1/works/:id – Detailansicht inkl. Vorschau-URL (öffentlich)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.works.getWithPreview(id);
  }

  // GET /api/v1/works/:id/similar – Ähnliche Werke (B-065)
  @Get(":id/similar")
  similar(@Param("id") id: string, @Query("limit") limit?: string) {
    return this.works.similar(id, limit ? Number(limit) : 8);
  }

  // GET /api/v1/works/:id/related – Related works (F-586)
  @Get(":id/related")
  related(@Param("id") id: string, @Query("limit") limit?: string) {
    return this.works.getRelatedWorks(id, limit ? Number(limit) : 5);
  }

  // PATCH /api/v1/works/:id/promo – Promotional price (F-455)
  @Patch(":id/promo")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  setPromoPrice(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("promoPrice") promoPrice: number | null,
    @Body("promoEndsAt") promoEndsAt: string | null,
  ) {
    return this.works.setPromoPrice(userId, id, promoPrice, promoEndsAt);
  }

  // PATCH /api/v1/works/:id/earnings-goal – Earnings goal (F-460)
  @Patch(":id/earnings-goal")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  setEarningsGoal(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("earningsGoalCents") earningsGoalCents: number | null,
  ) {
    return this.works.setEarningsGoal(userId, id, earningsGoalCents);
  }

  // GET /api/v1/works/:id/episodes – Episodenliste (öffentlich, B-033)
  @Get(":id/episodes")
  listEpisodes(@Param("id") id: string) {
    return this.works.listEpisodes(id);
  }

  // POST /api/v1/works/:id/episodes – Episode hinzufügen (ARTIST, B-033)
  @Post(":id/episodes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  addEpisode(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { title: string; number: number; description?: string; durationSeconds?: number },
  ) {
    return this.works.addEpisode(userId, workId, body);
  }

  // DELETE /api/v1/works/:id/episodes/:episodeId – Episode löschen (ARTIST, B-033)
  @Delete(":id/episodes/:episodeId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  deleteEpisode(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.works.deleteEpisode(userId, workId, episodeId);
  }

  // GET /api/v1/works/:id/metrics – Werk-Metriken (ARTIST, Eigentümer, B-142)
  @Get(":id/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  metrics(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.metrics(userId, id);
  }

  // GET /api/v1/works/:id/ratings – Durchschnittsbewertung (B-129)
  @Get(":id/ratings")
  getRatingSummary(@Param("id") id: string) {
    return this.ratings.summary(id);
  }

  // GET /api/v1/works/:id/reviews – Rezensionen (B-130, F-529/F-530)
  @Get(":id/reviews")
  getReviews(
    @Param("id") id: string,
    @Query("sort") sort?: 'recent' | 'helpful' | 'top',
    @Query("rating") rating?: string,
  ) {
    return this.reviews.list(id, {
      sort,
      rating: rating !== undefined ? Number(rating) : undefined,
    });
  }

  // GET /api/v1/works/:id/chapters – Kapitelmarken (B-034)
  @Get(":id/chapters")
  listChapters(@Param("id") id: string) {
    return this.chapters.list(id);
  }

  // POST /api/v1/works/:id/chapters – Kapitelmarke anlegen (ARTIST, B-034)
  @Post(":id/chapters")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  addChapter(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { title: string; positionSeconds: number; episodeId?: string },
  ) {
    return this.chapters.create(userId, workId, body);
  }

  // DELETE /api/v1/works/:id/chapters/:markId – Kapitelmarke löschen (ARTIST, B-034)
  @Delete(":id/chapters/:markId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  removeChapter(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Param("markId") markId: string,
  ) {
    return this.chapters.remove(userId, workId, markId);
  }

  // POST /api/v1/works/:id/transcripts – Transkript anlegen/aktualisieren (ARTIST)
  @Post(":id/transcripts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  upsertTranscript(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { language: string; format: string; content: string },
  ) {
    return this.transcripts.upsert(userId, workId, body);
  }

  // GET /api/v1/works/:id/transcripts – Transkript-Liste
  @Get(":id/transcripts")
  listTranscripts(@Param("id") workId: string) {
    return this.transcripts.list(workId);
  }

  // GET /api/v1/works/:id/transcripts/search – Volltext-Suche im Transkript
  @Get(":id/transcripts/search")
  searchTranscript(@Param("id") workId: string, @Query("q") q: string) {
    return this.transcripts.search(workId, q);
  }

  // GET /api/v1/works/:id/transcripts/:lang – Transkript abrufen
  @Get(":id/transcripts/:lang")
  getTranscript(@Param("id") workId: string, @Param("lang") lang: string) {
    return this.transcripts.get(workId, lang);
  }

  // DELETE /api/v1/works/:id/transcripts/:lang – Transkript löschen (ARTIST)
  @Delete(":id/transcripts/:lang")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  deleteTranscript(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Param("lang") lang: string,
  ) {
    return this.transcripts.delete(userId, workId, lang);
  }

  // POST /api/v1/works/:id/versions – neue Version hochladen (ARTIST)
  @Post(":id/versions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  addVersion(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { mediaKey: string; note?: string },
  ) {
    return this.works.addVersion(userId, workId, body.mediaKey, body.note);
  }

  // GET /api/v1/works/:id/versions – Versionshistorie (ARTIST)
  @Get(":id/versions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  getVersionHistory(@CurrentUser() userId: string, @Param("id") workId: string) {
    return this.works.getVersionHistory(userId, workId);
  }

  // GET /api/v1/works/:id/qr – QR-Code für ein Werk (F-140)
  @Get(":id/qr")
  getWorkQrCode(@Param("id") id: string) {
    return this.works.getWorkQrCode(id);
  }

  // GET /api/v1/works/:id/subtitles – Untertitel-Tracks auflisten
  @Get(":id/subtitles")
  listSubtitles(@Param("id") workId: string) {
    return this.subtitles.list(workId);
  }

  // POST /api/v1/works/:id/subtitles – Untertitel-Track anlegen (ARTIST)
  @Post(":id/subtitles")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  createSubtitle(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { language: string; format: string; url: string },
  ) {
    return this.subtitles.create(userId, workId, body.language, body.format, body.url);
  }

  // DELETE /api/v1/works/:id/subtitles/:trackId – Untertitel-Track löschen (ARTIST)
  @Delete(":id/subtitles/:trackId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  deleteSubtitle(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Param("trackId") trackId: string,
  ) {
    return this.subtitles.delete(userId, workId, trackId);
  }

  // PATCH /api/v1/works/:id/subtitles/:trackId/default – Standard-Track setzen (ARTIST)
  @Patch(":id/subtitles/:trackId/default")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  setDefaultSubtitle(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Param("trackId") trackId: string,
  ) {
    return this.subtitles.setDefault(userId, workId, trackId);
  }

  // GET /api/v1/works/:id/lyrics – Liedtext abrufen
  @Get(":id/lyrics")
  getLyrics(@Param("id") workId: string) {
    return this.lyrics.get(workId);
  }

  // POST /api/v1/works/:id/lyrics – Liedtext anlegen/aktualisieren (ARTIST)
  @Post(":id/lyrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  upsertLyrics(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { content: string; format: string; language?: string },
  ) {
    return this.lyrics.upsert(userId, workId, body.content, body.format, body.language);
  }

  // DELETE /api/v1/works/:id/lyrics – Liedtext löschen (ARTIST)
  @Delete(":id/lyrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  deleteLyrics(@CurrentUser() userId: string, @Param("id") workId: string) {
    return this.lyrics.delete(userId, workId);
  }

  // GET /api/v1/works/:id/translations – Übersetzungen auflisten
  @Get(":id/translations")
  listTranslations(@Param("id") workId: string) {
    return this.translations.list(workId);
  }

  // POST /api/v1/works/:id/translations – Übersetzung anlegen/aktualisieren (ARTIST)
  @Post(":id/translations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  upsertTranslation(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { language: string; title: string; description?: string },
  ) {
    return this.translations.upsert(userId, workId, body.language, body.title, body.description);
  }

  // DELETE /api/v1/works/:id/translations/:language – Übersetzung löschen (ARTIST)
  @Delete(":id/translations/:language")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  deleteTranslation(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Param("language") language: string,
  ) {
    return this.translations.delete(userId, workId, language);
  }

  // PATCH /api/v1/works/:id/accessibility – Barrierefreiheits-Flags setzen (F-651)
  @Patch(":id/accessibility")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  updateAccessibility(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body() body: { hasTranscript?: boolean; hasAudioDescription?: boolean; hasCaptions?: boolean },
  ) {
    return this.works.updateAccessibility(userId, workId, body);
  }

  // GET /api/v1/works/collections – eigene Sammlungen (F-606)
  @Get("collections")
  @UseGuards(JwtAuthGuard)
  listCollections(@CurrentUser() userId: string) {
    return this.collections.list(userId);
  }

  // POST /api/v1/works/collections – Sammlung erstellen (F-606)
  @Post("collections")
  @UseGuards(JwtAuthGuard)
  createCollection(
    @CurrentUser() userId: string,
    @Body() body: { title: string; description?: string; isPublic?: boolean },
  ) {
    return this.collections.create(userId, body.title, body.description, body.isPublic);
  }

  // GET /api/v1/works/collections/:id – Sammlung abrufen (F-606)
  @Get("collections/:id")
  getCollection(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.collections.getPublic(id, userId);
  }

  // PATCH /api/v1/works/collections/:id – Sammlung bearbeiten (F-606)
  @Patch("collections/:id")
  @UseGuards(JwtAuthGuard)
  updateCollection(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: { title?: string; description?: string; isPublic?: boolean },
  ) {
    return this.collections.update(userId, id, body);
  }

  // DELETE /api/v1/works/collections/:id – Sammlung löschen (F-606)
  @Delete("collections/:id")
  @UseGuards(JwtAuthGuard)
  deleteCollection(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.collections.delete(userId, id);
  }

  // POST /api/v1/works/collections/:id/works – Werk zu Sammlung hinzufügen (F-606)
  @Post("collections/:id/works")
  @UseGuards(JwtAuthGuard)
  addToCollection(
    @CurrentUser() userId: string,
    @Param("id") collectionId: string,
    @Body("workId") workId: string,
  ) {
    return this.collections.addWork(userId, collectionId, workId);
  }

  // DELETE /api/v1/works/collections/:id/works/:workId – Werk aus Sammlung entfernen (F-606)
  @Delete("collections/:id/works/:workId")
  @UseGuards(JwtAuthGuard)
  removeFromCollection(
    @CurrentUser() userId: string,
    @Param("id") collectionId: string,
    @Param("workId") workId: string,
  ) {
    return this.collections.removeWork(userId, collectionId, workId);
  }

  // GET /api/v1/works/:id/geo-check – Geo-blocking check (F-914)
  @Get(":id/geo-check")
  geoCheck(@Param("id") id: string, @Query("ip") ip?: string) {
    return this.geo.checkAccess(id, ip ?? '');
  }

  // POST /api/v1/works/:id/auto-translate – Auto-Translation stub (F-915)
  @Post(":id/auto-translate")
  @UseGuards(JwtAuthGuard)
  autoTranslateWork(
    @Param("id") id: string,
    @Body("targetLanguage") targetLanguage: string,
  ) {
    return this.autoTranslate.autoTranslate(id, targetLanguage);
  }

  // POST /api/v1/works/:id/cover-art – AI Cover Art Generation stub (F-1000)
  @Post(":id/cover-art")
  @UseGuards(JwtAuthGuard)
  generateCoverArt(
    @Param("id") id: string,
    @Body("style") style?: string,
  ) {
    return this.ai.generateCoverArt(id, style);
  }

  // ─── F-383: Discount codes ───────────────────────────────────────────────

  // POST /api/v1/works/discount-codes – Rabattcode erstellen (ARTIST)
  @Post("discount-codes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  createDiscountCode(
    @CurrentUser() userId: string,
    @Body() body: { code: string; discountPercent: number; maxUses?: number; expiresAt?: string },
  ) {
    return this.discountCodes.create(userId, body);
  }

  // GET /api/v1/works/discount-codes – eigene Rabattcodes auflisten (ARTIST)
  @Get("discount-codes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  listDiscountCodes(@CurrentUser() userId: string) {
    return this.discountCodes.list(userId);
  }

  // DELETE /api/v1/works/discount-codes/:id – Rabattcode löschen (ARTIST)
  @Delete("discount-codes/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  deleteDiscountCode(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.discountCodes.delete(userId, id);
  }

  // POST /api/v1/works/discount-codes/apply – Rabattcode anwenden
  @Post("discount-codes/apply")
  @UseGuards(JwtAuthGuard)
  applyDiscountCode(
    @CurrentUser() userId: string,
    @Body("code") code: string,
    @Body("workId") workId: string,
  ) {
    return this.discountCodes.apply(code, workId, userId);
  }

  // ─── F-441: UTM Tracking ─────────────────────────────────────────────────

  // POST /api/v1/works/utm-track – UTM-Klick erfassen (public, no auth)
  @Post("utm-track")
  trackUtm(
    @Body() body: { source: string; medium?: string; campaign?: string; workId?: string; userId?: string },
  ) {
    return this.utm.track(body);
  }

  // GET /api/v1/works/:id/stats – Work-Statistiken (F-129)
  @Get(":id/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  getWorkStats(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.getWorkStats(userId, id);
  }

  // GET /api/v1/works/:id/conversion-rate – Konversionsrate (F-131)
  @Get(":id/conversion-rate")
  getConversionRate(@Param("id") id: string) {
    return this.works.getConversionRate(id);
  }

  // GET /api/v1/works/:id/share – Share-Informationen (F-234/F-235)
  @Get(":id/share")
  getShareInfo(@Param("id") id: string) {
    return this.works.getShareInfo(id);
  }

  // GET /api/v1/works/:id/qr-code – QR-Code (F-140, alternate path)
  @Get(":id/qr-code")
  getWorkQrCodeAlt(@Param("id") id: string) {
    return this.works.getWorkQrCode(id);
  }

  // GET /api/v1/works/analytics-portal – Self-Service-Analytics-Portal (F-761)
  @Get("analytics-portal")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  analyticsPortal(@CurrentUser() userId: string) {
    return this.works.getAnalyticsPortal(userId);
  }

  // GET /api/v1/works/revenue-export.csv – Revenue-Export als CSV (F-763)
  @Get("revenue-export.csv")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="revenue.csv"')
  async revenueExportCsv(@CurrentUser() userId: string) {
    return this.works.exportRevenueAsCsv(userId);
  }

  // PATCH /api/v1/works/:id/license – Lizenztyp setzen (F-112)
  @Patch(":id/license")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  updateLicense(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("licenseType") licenseType: string,
  ) {
    return this.works.updateLicenseType(userId, id, licenseType);
  }

  // POST /api/v1/works/:id/categories – Kategorie zuweisen (F-146/F-147)
  @Post(":id/categories")
  @UseGuards(JwtAuthGuard)
  assignCategory(@Param("id") workId: string, @Body("categoryId") categoryId: string) {
    return this.categories.assignCategory(workId, categoryId);
  }

  // DELETE /api/v1/works/:id/categories/:categoryId – Kategorie entfernen (F-146/F-147)
  @Delete(":id/categories/:categoryId")
  @UseGuards(JwtAuthGuard)
  removeCategory(@Param("id") workId: string, @Param("categoryId") categoryId: string) {
    return this.categories.removeCategory(workId, categoryId);
  }

  // PUT /api/v1/works/:id/revenue-shares – Einnahmenteilung konfigurieren (F-386/F-387)
  @Put(":id/revenue-shares")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  setRevenueShares(
    @CurrentUser() userId: string,
    @Param("id") workId: string,
    @Body("splits") splits: { artistId: string; pct: number }[],
  ) {
    return this.works.setRevenueShares(userId, workId, splits);
  }

  // GET /api/v1/works/:id/revenue-shares – Einnahmenteilung abrufen (F-386)
  @Get(":id/revenue-shares")
  @UseGuards(JwtAuthGuard)
  getRevenueShares(@Param("id") workId: string) {
    return this.works.getRevenueShares(workId);
  }

  // GET /api/v1/works/currency-convert – Währungsumrechnung (F-413/F-414)
  @Get("currency-convert")
  convertCurrency(
    @Query("amount") amount: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.works.convertCurrency(Number(amount), from ?? 'EUR', to ?? 'EUR');
  }

  // F-085: Qualitätsstufen
  @Get("quality-levels")
  qualityLevels() { return this.stubs.getQualityLevels(); }

  // F-086: Audio-Fingerprinting
  @Post(":id/fingerprint")
  @UseGuards(JwtAuthGuard)
  fingerprint(@Param("id") workId: string) { return this.stubs.fingerprintWork(workId); }

  // F-087/F-088: ISRC / ISBN
  @Get(":id/identifiers")
  @UseGuards(JwtAuthGuard)
  getIdentifiers(@Param("id") workId: string) { return this.stubs.getWorkIdentifiers(workId); }

  @Patch(":id/identifiers")
  @UseGuards(JwtAuthGuard)
  setIdentifiers(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { isrc?: string; isbn?: string; ean?: string }) {
    return this.stubs.setWorkIdentifiers(user.userId, workId, body);
  }

  // F-089: Lautstärke-Normalisierung
  @Get(":id/audio-analysis")
  @UseGuards(JwtAuthGuard)
  audioAnalysis(@Param("id") workId: string) { return this.stubs.getWorkAudioAnalysis(workId); }

  // F-090: Spektrum-Analyse
  @Get(":id/spectrum")
  spectrumAnalysis(@Param("id") workId: string) { return this.stubs.getSpectrumAnalysis(workId); }

  // F-091: Cover aus ID3
  @Post(":id/extract-cover")
  @UseGuards(JwtAuthGuard)
  extractCover(@Param("id") workId: string, @CurrentUser() user: { userId: string }) { return this.stubs.extractCoverFromId3(user.userId, workId); }

  // F-092: Metadaten aus ID3 importieren
  @Post(":id/import-metadata")
  @UseGuards(JwtAuthGuard)
  importMetadata(@Param("id") workId: string, @CurrentUser() user: { userId: string }) { return this.stubs.importId3Metadata(user.userId, workId); }

  // F-094: Bulk-Edit
  @Patch("bulk")
  @UseGuards(JwtAuthGuard)
  bulkUpdate(@CurrentUser() user: { userId: string }, @Body() body: { workIds: string[]; patch: Record<string, unknown> }) {
    return this.stubs.bulkUpdateWorks(user.userId, body.workIds ?? [], body.patch ?? {});
  }

  // F-096: Version-Diff
  @Get(":id/versions/diff")
  @UseGuards(JwtAuthGuard)
  versionDiff(@Param("id") workId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.stubs.getVersionDiff(workId, Number(from) || 1, Number(to) || 2);
  }

  // F-100: Werk-Vorlagen
  @Get("templates")
  @UseGuards(JwtAuthGuard)
  getTemplates(@CurrentUser() user: { userId: string }) { return this.stubs.getWorkTemplates(user.userId); }

  @Post("templates")
  @UseGuards(JwtAuthGuard)
  saveTemplate(@CurrentUser() user: { userId: string }, @Body() body: { name: string; fields: Record<string, unknown> }) {
    return this.stubs.saveWorkTemplate(user.userId, body.name, body.fields ?? {});
  }

  // F-101: CUE-Sheet Import
  @Post(":id/chapters/import-cue")
  @UseGuards(JwtAuthGuard)
  importCue(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("cue") cue: string) {
    return this.stubs.importCueSheet(user.userId, workId, cue ?? '');
  }

  // F-102: CUE-Sheet Export
  @Get(":id/chapters/export-cue")
  exportCue(@Param("id") workId: string) { return this.stubs.exportCueSheet(workId); }

  // F-104: Whisper AI Transkription
  @Post(":id/transcripts/whisper")
  @UseGuards(JwtAuthGuard)
  triggerWhisper(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("language") language?: string) {
    return this.stubs.triggerWhisperTranscription(user.userId, workId, language);
  }

  // F-106: Transkript-Sync-Info
  @Get(":id/transcripts/sync")
  transcriptSync(@Param("id") workId: string) { return this.stubs.getTranscriptSyncInfo(workId); }

  // F-107: Sprach-Erkennung
  @Get(":id/detect-language")
  detectLanguage(@Param("id") workId: string) { return this.stubs.detectLanguage(workId); }

  // F-110: KI-Metadaten (Stimmung, Tempo)
  @Get(":id/ai-metadata")
  aiMetadata(@Param("id") workId: string) { return this.stubs.getAiMetadata(workId); }

  // F-114: Per-Werk Geo-Blocking
  @Patch(":id/geo-block")
  @UseGuards(JwtAuthGuard)
  setGeoBlock(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("blockedCountries") blockedCountries: string[]) {
    return this.stubs.setWorkGeoBlock(user.userId, workId, blockedCountries ?? []);
  }

  // F-115: Altersfreigabe
  @Patch(":id/age-rating")
  @UseGuards(JwtAuthGuard)
  setAgeRating(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { rating: string; system: 'FSK' | 'USK' | 'PEGI' }) {
    return this.stubs.setAgeRating(user.userId, workId, body.rating, body.system ?? 'FSK');
  }

  // F-120: Bonus-Material
  @Get(":id/bonus")
  bonusMaterial(@Param("id") workId: string) { return this.stubs.getBonusMaterial(workId); }

  @Post(":id/bonus")
  @UseGuards(JwtAuthGuard)
  addBonusMaterial(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { title: string; type: string; url: string }) {
    return this.stubs.addBonusMaterial(user.userId, workId, body);
  }

  // F-121: Transkript-Annotation
  @Post(":id/transcripts/annotate")
  @UseGuards(JwtAuthGuard)
  annotateTranscript(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { timestamp: number; text: string }) {
    return this.stubs.addTranscriptAnnotation(user.userId, workId, body.timestamp ?? 0, body.text ?? '');
  }

  // F-122: Audio-Kommentarspur
  @Get(":id/commentary")
  audioCommentary(@Param("id") workId: string) { return this.stubs.getAudioCommentaryInfo(workId); }

  // F-125: Bookmarks exportieren
  @Get("bookmarks/export")
  @UseGuards(JwtAuthGuard)
  exportBookmarks(@CurrentUser() user: { userId: string }, @Query("format") format: string) {
    return this.stubs.exportBookmarks(user.userId, (format as 'txt' | 'pdf') ?? 'txt');
  }

  // F-127: Notizen teilen
  @Post("notes/:noteId/share")
  @UseGuards(JwtAuthGuard)
  shareNote(@Param("noteId") noteId: string, @CurrentUser() user: { userId: string }, @Body("targetUserId") targetUserId: string) {
    return this.stubs.shareNote(user.userId, noteId, targetUserId);
  }

  // F-128: Lese-/Hörmodus
  @Patch("reading-mode")
  @UseGuards(JwtAuthGuard)
  setReadingMode(@CurrentUser() user: { userId: string }, @Body("mode") mode: 'LISTEN' | 'READ') {
    return this.stubs.setReadingMode(user.userId, mode ?? 'LISTEN');
  }

  // F-130: Abspiel-Heatmap
  @Get(":id/heatmap")
  @UseGuards(JwtAuthGuard)
  playHeatmap(@Param("id") workId: string) { return this.stubs.getPlayHeatmap(workId); }

  // F-132: A/B-Test Cover-Art
  @Post(":id/ab-test/cover")
  @UseGuards(JwtAuthGuard)
  createCoverAbTest(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("variantUrl") variantUrl: string) {
    return this.stubs.createCoverAbTest(user.userId, workId, variantUrl ?? '');
  }

  // F-134: Spotlights
  @Get("spotlights")
  getSpotlights() { return this.stubs.getSpotlights(); }

  // F-135: Embed-Player
  @Get(":id/embed")
  embedUrl(@Param("id") workId: string) { return this.stubs.getEmbedUrl(workId); }

  // F-136: Widget-Generator
  @Get("widget")
  @UseGuards(JwtAuthGuard)
  widgetCode(@CurrentUser() user: { userId: string }, @Query("theme") theme: string, @Query("works") works: string) {
    return this.stubs.getWidgetCode(user.userId, (theme as 'light' | 'dark') ?? 'light');
  }

  // F-138: Atom-Feed
  @Get("feed.atom")
  atomFeed(@Query("category") category: string) { return this.stubs.getAtomFeedUrl(category ?? 'all'); }

  // F-139: OPDS-Katalog
  @Get("opds")
  opdsCatalog() { return this.stubs.getOpdsCatalogUrl(); }

  // F-141: NFC-URL
  @Get(":id/nfc")
  nfcUrl(@Param("id") workId: string) { return this.stubs.getNfcUrl(workId); }

  // F-142: Schaufenster-Modus
  @Patch("showcase")
  @UseGuards(JwtAuthGuard)
  setShowcase(@CurrentUser() user: { userId: string }, @Body() body: { featuredWorkIds: string[]; headerText?: string; bannerUrl?: string }) {
    return this.stubs.setShowcaseConfig(user.userId, body);
  }

  // F-143: Slideshow
  @Patch(":id/slideshow")
  @UseGuards(JwtAuthGuard)
  setSlideshow(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { intervalSeconds: number; showLyrics: boolean }) {
    return this.stubs.setSlideshowConfig(user.userId, workId, body);
  }

  // F-148: Custom-Attribute
  @Get(":id/custom-attributes")
  getCustomAttributes(@Param("id") workId: string) { return this.stubs.getCustomAttributes(workId); }

  @Patch(":id/custom-attributes")
  @UseGuards(JwtAuthGuard)
  setCustomAttributes(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() attributes: Record<string, unknown>) {
    return this.stubs.setCustomAttributes(user.userId, workId, attributes);
  }

  // F-150: Mehrsprachige Audio-Tracks
  @Get(":id/audio-tracks")
  getAudioTracks(@Param("id") workId: string) { return this.stubs.getAudioTracks(workId); }

  @Post(":id/audio-tracks")
  @UseGuards(JwtAuthGuard)
  addAudioTrack(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() track: { language: string; uploadUrl: string }) {
    return this.stubs.addAudioTrack(user.userId, workId, track);
  }

  // F-153: Chords
  @Get(":id/chords")
  getChords(@Param("id") workId: string) { return this.stubs.getChords(workId); }

  // F-154/F-155: MIDI / Sheet Music
  @Get(":id/attachments")
  getAttachments(@Param("id") workId: string) { return this.stubs.getWorkAttachments(workId); }

  @Patch(":id/attachments")
  @UseGuards(JwtAuthGuard)
  setAttachments(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { midiUrl?: string; sheetMusicUrl?: string }) {
    return this.stubs.setWorkAttachments(user.userId, workId, body);
  }

  // F-157/F-158: Waveform
  @Get(":id/waveform")
  getWaveform(@Param("id") workId: string) { return this.stubs.getWaveformData(workId); }

  // F-159: Spektrogramm
  @Get(":id/spectrogram")
  getSpectrogram(@Param("id") workId: string) { return this.stubs.getSpectrogram(workId); }

  // F-160/F-161: 3D / Spatial Audio Flags
  @Get(":id/audio-flags")
  getAudioFlags(@Param("id") workId: string) { return this.stubs.getAudioFeatureFlags(workId); }

  @Patch(":id/audio-flags")
  @UseGuards(JwtAuthGuard)
  setAudioFlags(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() flags: { binaural3d?: boolean; dolbyAtmos?: boolean; spatialAudio?: boolean }) {
    return this.stubs.setAudioFeatureFlags(user.userId, workId, flags);
  }

  // F-162: Kapitel-TOC
  @Get(":id/toc")
  getChapterToc(@Param("id") workId: string) { return this.stubs.getChapterToc(workId); }

  // F-163: Auto-Kapitel-Erkennung
  @Post(":id/auto-chapters")
  @UseGuards(JwtAuthGuard)
  autoChapters(@Param("id") workId: string, @CurrentUser() user: { userId: string }) {
    return this.stubs.triggerAutoChapterDetection(user.userId, workId);
  }

  // F-167: Live-Premiere
  @Patch(":id/premiere")
  @UseGuards(JwtAuthGuard)
  setLivePremiere(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("premiereAt") premiereAt: string) {
    return this.stubs.setLivePremiere(user.userId, workId, premiereAt);
  }

  // F-168: Pre-Release-Registrierung
  @Post(":id/pre-release")
  @UseGuards(JwtAuthGuard)
  registerPreRelease(@Param("id") workId: string, @CurrentUser() user: { userId: string }) {
    return this.stubs.registerPreRelease(user.userId, workId);
  }

  // F-169: Crowdfunding-Status
  @Get(":id/crowdfunding")
  crowdfundingStatus(@Param("id") workId: string) { return this.stubs.getCrowdfundingStatus(workId); }

  // F-170: Produktions-Fortschritt
  @Patch(":id/production-progress")
  @UseGuards(JwtAuthGuard)
  setProductionProgress(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { percentComplete: number; note?: string }) {
    return this.stubs.setProductionProgress(user.userId, workId, body.percentComplete ?? 0, body.note);
  }

  // F-171/F-172/F-173: Werk-Tagebuch / BTS / WIP
  @Get(":id/diary")
  getWorkDiary(@Param("id") workId: string) { return this.stubs.getWorkDiary(workId); }

  @Post(":id/diary")
  @UseGuards(JwtAuthGuard)
  addDiaryEntry(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body() body: { type: 'DIARY' | 'BTS' | 'WIP'; content: string; mediaUrl?: string }) {
    return this.stubs.addWorkDiaryEntry(user.userId, workId, body.type ?? 'DIARY', body.content ?? '', body.mediaUrl);
  }

  // F-175: ML-Genre-Klassifikation
  @Get(":id/classify-genre")
  classifyGenre(@Param("id") workId: string) { return this.stubs.classifyGenre(workId); }

  // F-177: Duplikaterkennung
  @Get(":id/duplicates")
  @UseGuards(JwtAuthGuard)
  checkDuplicates(@Param("id") workId: string) { return this.stubs.checkDuplicates(workId); }

  // F-178: Copyright-Scan
  @Post(":id/copyright-scan")
  @UseGuards(JwtAuthGuard)
  copyrightScan(@Param("id") workId: string) { return this.stubs.runCopyrightScan(workId); }

  // F-179: Qualitäts-Score
  @Get(":id/quality-score")
  qualityScore(@Param("id") workId: string) { return this.stubs.getWorkQualityScore(workId); }

  // F-181: Volltext-Suche über Transkripte – handled by GET /:id/transcripts/search

  // F-182: Phonetische Suche
  @Get("search/phonetic")
  phoneticSearch(@Query("q") q: string) {
    return { query: q, message: 'Phonetic search stub – use pg_trgm similarity() or soundex() in production', results: [] };
  }

  // F-185: Personalisierte Suchvorschläge aus Hörhistorie
  @Get("search/personalized-suggestions")
  @UseGuards(JwtAuthGuard)
  personalizedSuggestions(@CurrentUser() user: { userId: string }, @Query("q") q: string) {
    return { userId: user.userId, query: q, suggestions: [], message: 'Personalized suggestions based on user loan history – implement in production with ML model' };
  }

  // F-186: Semantische Suche
  @Get("search/semantic")
  semanticSearch(@Query("q") q: string) {
    return { query: q, message: 'Semantic search stub – use pgvector + OpenAI embeddings in production', results: [] };
  }

  // F-187: Sprachsuche per Mikrofon
  @Post("search/voice")
  voiceSearch(@Body("audioBase64") audioBase64: string) {
    return { transcribed: null, results: [], message: 'Voice search stub – pipe audioBase64 to Whisper API for transcription, then text search' };
  }

  // F-188: Bild-Suche
  @Post("search/image")
  imageSearch(@Body("imageBase64") imageBase64: string) {
    return { results: [], message: 'Image search stub – extract cover art features via CLIP model, compare with indexed cover embeddings' };
  }

  // F-189: Suche nach Stimmung
  @Get("search/mood")
  moodSearch(@Query("mood") mood: string, @Query("limit") limit?: string) {
    return { mood, results: [], message: `Filter works by mood tag "${mood}" – use GET /api/v1/works?tags=${mood}`, searchUrl: `/api/v1/works?tags=${mood}&limit=${limit ?? 20}` };
  }

  // F-190: Suche nach Tempo / BPM
  @Get("search/bpm")
  bpmSearch(@Query("min") min?: string, @Query("max") max?: string) {
    return { minBpm: min ?? '0', maxBpm: max ?? '999', results: [], message: 'BPM stored in Work.tags or audio analysis metadata – query via full-text or AI metadata field' };
  }

  // F-191: Suche nach Sprechstimme
  @Get("search/voice-type")
  voiceTypeSearch(@Query("type") type: string) {
    return { voiceType: type, results: [], message: 'Voice type (hell, dunkel, sanft) stored as AI metadata tag post-upload analysis' };
  }

  // F-194: Filter: noch nicht gehört
  @Get("search/unheard")
  @UseGuards(JwtAuthGuard)
  unheardSearch(@CurrentUser() user: { userId: string }, @Query("limit") limit?: string) {
    return { userId: user.userId, message: 'Use GET /api/v1/works with excludeBorrowed=true parameter or filter by loan history server-side', limit: limit ?? 20, results: [] };
  }

  // F-196: Filter: in Wunschliste
  @Get("search/in-wishlist")
  @UseGuards(JwtAuthGuard)
  wishlistFilter(@CurrentUser() user: { userId: string }) {
    return { userId: user.userId, message: 'Use GET /api/v1/users/me/wishlist for full wishlist works', results: [] };
  }

  // F-198: Suchhistorie
  @Get("search/history")
  @UseGuards(JwtAuthGuard)
  searchHistory(@CurrentUser() user: { userId: string }) {
    return { userId: user.userId, history: [], message: 'Search history stored in AppSetting key search_history:<userId> – read via AppSetting service' };
  }

  @Delete("search/history")
  @UseGuards(JwtAuthGuard)
  async clearSearchHistory(@CurrentUser() user: { userId: string }) {
    return { userId: user.userId, cleared: true, message: 'Search history stored in AppSetting – delete key search_history:<userId>' };
  }

  // F-200: Suchresultate als RSS-Feed
  @Get("search/feed.rss")
  @Header("Content-Type", "application/rss+xml")
  searchRss(@Query("q") q: string) {
    const base = process.env.API_BASE_URL ?? 'https://api.creatorlend.com';
    return `<?xml version="1.0"?><rss version="2.0"><channel><title>CreatorLend: ${q}</title><link>${base}/api/v1/works?q=${q}</link><description>Suchergebnisse für "${q}"</description></channel></rss>`;
  }

  // F-233: Empfehlung per Direktnachricht
  @Post(":id/recommend-to")
  @UseGuards(JwtAuthGuard)
  recommendTo(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("recipientId") recipientId: string) {
    return { workId, from: user.userId, to: recipientId, message: 'Recommendation DM stub – use POST /api/v1/messages to send a DM with workId metadata' };
  }

  // F-236: Teilen in sozialen Medien
  @Post(":id/share/social")
  shareSocial(@Param("id") workId: string, @Body("platform") platform: string) {
    const base = process.env.APP_BASE_URL ?? 'https://app.creatorlend.com';
    const url = `${base}/works/${workId}`;
    const urls: Record<string, string> = { twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` };
    return { workId, platform, shareUrl: urls[platform] ?? url };
  }

  // F-237: Teilen per E-Mail
  @Post(":id/share/email")
  shareEmail(@Param("id") workId: string, @Body("to") to: string, @Body("message") message: string) {
    return { workId, to, sent: false, message: 'Email share stub – use mail service in production to send share email' };
  }

  // F-238: Teilen via WhatsApp
  @Get(":id/share/whatsapp")
  shareWhatsApp(@Param("id") workId: string) {
    const base = process.env.APP_BASE_URL ?? 'https://app.creatorlend.com';
    const url = encodeURIComponent(`${base}/works/${workId}`);
    return { workId, whatsappUrl: `https://wa.me/?text=${url}` };
  }

  // F-243: Wunschliste als RSS-Feed
  @Get("wishlist/:slug/feed.rss")
  @Header("Content-Type", "application/rss+xml")
  async wishlistRss(@Param("slug") slug: string) {
    const base = process.env.APP_BASE_URL ?? 'https://app.creatorlend.com';
    return `<?xml version="1.0"?><rss version="2.0"><channel><title>Wunschliste</title><link>${base}/wishlist/${slug}</link><description>Öffentliche Wunschliste auf CreatorLend</description></channel></rss>`;
  }

  // F-244: Preisalarm
  @Post(":id/price-alert")
  @UseGuards(JwtAuthGuard)
  priceAlert(@Param("id") workId: string, @CurrentUser() user: { userId: string }, @Body("targetPriceCents") targetPriceCents: number) {
    return { workId, userId: user.userId, targetPriceCents, registered: true, message: 'Price alert stub – check AppSetting price_alert:<workId> in scheduler' };
  }

  // F-245: Wieder verfügbar-Alarm
  @Post(":id/availability-alert")
  @UseGuards(JwtAuthGuard)
  availabilityAlert(@Param("id") workId: string, @CurrentUser() user: { userId: string }) {
    return { workId, userId: user.userId, registered: true, message: 'Re-availability alert stub – notify when work status changes back to PUBLISHED' };
  }

  // F-247: Benachrichtigung wenn Thema neue Werke hat
  @Post("search/topic-alert")
  @UseGuards(JwtAuthGuard)
  topicAlert(@CurrentUser() user: { userId: string }, @Body("query") query: string) {
    return { userId: user.userId, query, registered: true, message: 'Topic alert stub – schedule daily search job and email when new works match query' };
  }

  // F-248/F-249: Such-Operatoren (artist: / type: / duration:) – handled by GET /api/v1/works?q= with parser
  // F-250: Dokumentation der Such-Operatoren
  @Get("search/operators")
  searchOperators() {
    return {
      operators: [
        { op: 'artist:"Name"', description: 'Suche nach Werken eines bestimmten Künstlers / einer Künstlerin' },
        { op: 'type:PODCAST', description: 'Filtert nach Werktyp: MUSIC, PODCAST, AUDIOBOOK' },
        { op: 'duration:>60', description: 'Filtert nach Laufzeit in Minuten (>, <, =)' },
        { op: 'lang:de', description: 'Filtert nach Sprache (ISO 639-1)' },
        { op: 'tag:meditation', description: 'Filtert nach Tag' },
      ],
      example: '/api/v1/works?q=type:PODCAST duration:>30 tag:news',
    };
  }
}
