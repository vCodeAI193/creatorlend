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
import { WorksService } from "./works.service";
import { RatingsService } from "../engagement/ratings.service";
import { ReviewsService } from "../engagement/reviews.service";
import { CreateWorkDto } from "./dto/create-work.dto";
import { UpdateWorkDto } from "./dto/update-work.dto";

@Controller("works")
export class WorksController {
  constructor(
    private readonly works: WorksService,
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
}
