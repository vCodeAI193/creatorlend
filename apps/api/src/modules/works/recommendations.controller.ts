import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
}
