import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
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
import { CreateWorkDto } from "./dto/create-work.dto";
import { UpdateWorkDto } from "./dto/update-work.dto";

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

  // GET /api/v1/works – Suche / Discovery mit Facetten (F-581/F-582)
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

  // GET /api/v1/works/:id/qr – QR-Code-URL für das Werk (F-140)
  @Get(":id/qr")
  getQrCode(@Param("id") id: string) {
    return this.works.getWorkQrCode(id);
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

  // GET /api/v1/works/:id/reviews – Rezensionen (B-130)
  @Get(":id/reviews")
  getReviews(@Param("id") id: string) {
    return this.reviews.list(id);
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
}
