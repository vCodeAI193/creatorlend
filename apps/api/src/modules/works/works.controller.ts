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

  // GET /api/v1/works – Suche / Discovery (öffentlich, B-036/B-038/B-061 facets)
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
  ) {
    return this.works.search({
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
    });
  }

  // GET /api/v1/works/trending – Top-20 in den letzten 7 Tagen (B-063)
  @Get("trending")
  trending(@Query("limit") limit?: string) {
    return this.works.trending(limit ? Number(limit) : 20);
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
}
