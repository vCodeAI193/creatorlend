import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  feed(@CurrentUser() userId: string, @Query('limit') limit?: string) {
    return this.recs.getPersonalizedFeed(userId, limit ? Number(limit) : 20);
  }

  @Get('because-you-listened')
  @UseGuards(JwtAuthGuard)
  becauseYouListened(@CurrentUser() userId: string, @Query('limit') limit?: string) {
    return this.recs.getBecauseYouListened(userId, limit ? Number(limit) : 3);
  }

  @Get('similar/:workId')
  similar(@Param('workId') workId: string, @Query('limit') limit?: string) {
    return this.recs.getSimilarWorks(workId, limit ? Number(limit) : 10);
  }

  @Get('new-arrivals')
  newArrivals(@Query('limit') limit?: string) {
    return this.recs.getNewArrivals(limit ? Number(limit) : 20);
  }

  @Get('trending')
  trending(@Query('period') period?: 'day' | 'week' | 'month', @Query('limit') limit?: string) {
    return this.recs.getTrending(period ?? 'week', limit ? Number(limit) : 20);
  }

  // GET /api/v1/recommendations/daily-mix – Tägliche Playlist (F-228)
  @Get('daily-mix')
  @UseGuards(JwtAuthGuard)
  dailyMix(@CurrentUser() userId: string) {
    return this.recs.getDailyMix(userId);
  }

  // GET /api/v1/recommendations/trending-tags – Trending Tag Cloud (F-618)
  @Get('trending-tags')
  trendingTags(@Query('period') period?: 'day' | 'week' | 'month', @Query('limit') limit?: string) {
    return this.recs.getTrendingTags(period ?? 'week', limit ? Number(limit) : 50);
  }

  // F-208: Ähnliche Künstler:innen
  @Get('similar-artists/:artistId')
  similarArtists(@Param('artistId') artistId: string, @Query('limit') limit?: string) {
    return this.recs.getSimilarArtists(artistId, limit ? Number(limit) : 6);
  }

  // F-209: Andere Hörer:innen mögen auch
  @Get('also-like/:workId')
  alsoLike(@Param('workId') workId: string, @Query('limit') limit?: string) {
    return this.recs.getOtherListenersAlsoLike(workId, limit ? Number(limit) : 10);
  }

  // F-210: Collaborative Filtering
  @Get('collaborative')
  @UseGuards(JwtAuthGuard)
  collaborative(@CurrentUser() user: { userId: string }, @Query('limit') limit?: string) {
    return this.recs.getCollaborativeRecs(user.userId, limit ? Number(limit) : 10);
  }

  // F-211: Content-Based Filtering
  @Get('content-based/:workId')
  contentBased(@Param('workId') workId: string, @Query('limit') limit?: string) {
    return this.recs.getContentBasedRecs(workId, limit ? Number(limit) : 10);
  }

  // F-212: Hybrid-Recommender
  @Get('hybrid')
  @UseGuards(JwtAuthGuard)
  hybrid(@CurrentUser() user: { userId: string }, @Query('limit') limit?: string) {
    return this.recs.getHybridRecs(user.userId, limit ? Number(limit) : 10);
  }

  // F-213: Empfehlungen nach Tageszeit
  @Get('by-time')
  byTime(@Query('hour') hour?: string) {
    return this.recs.getTimeOfDayRecs(hour ? Number(hour) : new Date().getHours());
  }

  // F-214: Empfehlungen nach Wetter
  @Get('by-weather')
  byWeather(@Query('condition') condition = 'sunny') {
    return this.recs.getWeatherRecs(condition);
  }

  // F-215: Top-Charts nach Land
  @Get('charts/country')
  chartsByCountry(@Query('country') country = 'DE', @Query('limit') limit?: string) {
    return this.recs.getChartsByCountry(country, limit ? Number(limit) : 20);
  }

  // F-218: Genre-Charts
  @Get('charts/genre')
  genreCharts(@Query('genre') genre: string, @Query('limit') limit?: string) {
    return this.recs.getGenreCharts(genre ?? 'music', limit ? Number(limit) : 20);
  }

  // F-219: Editorielle Bestenliste
  @Get('best-of')
  bestOf(@Query('year') year?: string) {
    return this.recs.getEditorialBestOf(year ? Number(year) : undefined);
  }

  // F-220: Abstimmung Jahres-Top-10
  @Post('best-of/vote')
  @UseGuards(JwtAuthGuard)
  voteForBestOf(@CurrentUser() user: { userId: string }, @Body('workId') workId: string, @Body('year') year?: number) {
    return this.recs.voteForBestOf(user.userId, workId, year);
  }

  // F-221: Kategorieseiten
  @Get('category/:category')
  categoryPage(@Param('category') category: string) {
    return this.recs.getCategoryPage(category);
  }

  // F-223: Demnächst verfügbar
  @Get('upcoming')
  upcoming(@Query('limit') limit?: string) {
    return this.recs.getUpcomingReleases(limit ? Number(limit) : 20);
  }

  // F-224: Letzte Chance
  @Get('last-chance')
  lastChance(@Query('limit') limit?: string) {
    return this.recs.getLastChanceSoon(limit ? Number(limit) : 20);
  }

  // F-225: Kostenlos hörbar
  @Get('free-preview')
  freePreview(@Query('limit') limit?: string) {
    return this.recs.getFreePreview(limit ? Number(limit) : 20);
  }

  // F-226: Saisonale Sammlungen
  @Get('seasonal')
  seasonal() { return this.recs.getSeasonalCollections(); }

  // F-227: Thematische Playlisten
  @Get('editorial-playlists')
  editorialPlaylists() { return this.recs.getEditorialPlaylists(); }

  // F-229: Künstler:in der Woche
  @Get('artist-of-the-week')
  artistOfTheWeek() { return this.recs.getArtistOfTheWeek(); }

  // F-230: Podcast-Staffel-Empfehlungen
  @Get('binge-podcasts')
  bingePodcasts(@Query('limit') limit?: string) {
    return this.recs.getBingePodcasts(limit ? Number(limit) : 10);
  }

  // F-231: Empfehlungen aus Bookmarks
  @Get('from-bookmarks')
  @UseGuards(JwtAuthGuard)
  fromBookmarks(@CurrentUser() user: { userId: string }, @Query('limit') limit?: string) {
    return this.recs.getBookmarkBasedRecs(user.userId, limit ? Number(limit) : 10);
  }

  // F-232: Was hören Freunde
  @Get('social')
  @UseGuards(JwtAuthGuard)
  social(@CurrentUser() user: { userId: string }, @Query('limit') limit?: string) {
    return this.recs.getSocialRecs(user.userId, limit ? Number(limit) : 10);
  }
}
