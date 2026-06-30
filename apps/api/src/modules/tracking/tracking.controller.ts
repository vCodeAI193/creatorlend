import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { TrackingService } from './tracking.service';
import { UserRole } from '@creatorlend/shared';

// POST /api/v1/tracking/utm – UTM-Parameter erfassen (F-802, kein Auth erforderlich)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post('utm')
  trackUtm(
    @Body('userId') userId?: string,
    @Body('sessionId') sessionId?: string,
    @Body('source') source?: string,
    @Body('medium') medium?: string,
    @Body('campaign') campaign?: string,
    @Body('content') content?: string,
    @Body('term') term?: string,
    @Body('page') page?: string,
    @Body('referrer') referrer?: string,
  ) {
    return this.tracking.trackUtm({ userId, sessionId, source, medium, campaign, content, term, page, referrer });
  }

  // POST /api/v1/tracking/pageview – Seitenaufruf erfassen (F-782)
  @Post('pageview')
  trackPageView(
    @Body('path') path: string,
    @Body('userId') userId?: string,
    @Body('sessionId') sessionId?: string,
    @Body('referrer') referrer?: string,
    @Body('durationMs') durationMs?: number,
  ) {
    return this.tracking.trackPageView({ path, userId, sessionId, referrer, durationMs });
  }

  // POST /api/v1/tracking/influencer-referral – Influencer-Referral tracken (F-803)
  @Post('influencer-referral')
  trackInfluencerReferral(
    @Body('referrerId') referrerId: string,
    @Body('newUserId') newUserId: string,
  ) {
    return this.tracking.trackInfluencerReferral(referrerId, newUserId);
  }
}

// Admin-Analytics (F-801)
@Controller('admin/tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('attribution')
  getAttribution(@Query('from') from?: string) {
    return this.tracking.getAttribution(from);
  }

  @Get('campaigns')
  getCampaigns(@Query('from') from?: string) {
    return this.tracking.getCampaignStats(from);
  }

  @Get('bot-traffic')
  getBotTraffic() {
    return this.tracking.getBotTrafficShare();
  }

  // GET /api/v1/admin/tracking/pageviews – Seitenaufruf-Statistiken (F-782)
  @Get('pageviews')
  getPageViews(@Query('from') from?: string) {
    return this.tracking.getPageViewStats(from);
  }

  // GET /api/v1/admin/tracking/influencers – Influencer-Statistiken (F-803)
  @Get('influencers')
  getInfluencerStats(@Query('from') from?: string, @Query('limit') limit?: string) {
    return this.tracking.getInfluencerStats(from, limit ? Number(limit) : 20);
  }
}
