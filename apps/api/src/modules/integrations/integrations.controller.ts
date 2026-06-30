import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { UserRole } from '@creatorlend/shared';

// F-871-F-913: Drittanbieter-Integrationen
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  // F-871: API v2 Info
  @Get('api/v2')
  apiV2Info() {
    return this.integrations.getApiV2Info();
  }

  // F-882: Changelog
  @Get('api/changelog')
  changelog() {
    return this.integrations.getChangelog();
  }

  // F-887: Zapier-Trigger-Info
  @Get('zapier/triggers')
  zapierTriggers() {
    return this.integrations.getZapierTriggers();
  }

  // F-904: Slack-Bot-Info
  @Get('slack')
  slackBot() {
    return this.integrations.getSlackBotInfo();
  }

  // F-876: API-Quota
  @Get('quota')
  @UseGuards(JwtAuthGuard)
  quota(@CurrentUser() user: { userId: string }) {
    return this.integrations.getApiQuota(user.userId);
  }

  // F-893: LastFM-Scrobbling (stub)
  @Post('lastfm/scrobble/:workId')
  @UseGuards(JwtAuthGuard)
  scrobble(@Param('workId') workId: string, @CurrentUser() user: { userId: string }) {
    return this.integrations.scrobbleToLastFm(user.userId, workId);
  }

  // F-898: Readwise-Export
  @Get('readwise/highlights')
  @UseGuards(JwtAuthGuard)
  readwiseExport(@CurrentUser() user: { userId: string }) {
    return this.integrations.exportHighlightsToReadwise(user.userId);
  }

  // F-895: Goodreads-Empfehlungen
  @Get('goodreads/recommendations')
  @UseGuards(JwtAuthGuard)
  goodreadsRecs(@CurrentUser() user: { userId: string }) {
    return this.integrations.getGoodreadsRecommendations(user.userId);
  }
}

// Admin: Marketing & IP
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminIntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  // F-911: Mailchimp-Sync
  @Post('mailchimp/sync/:userId')
  syncMailchimp(@Param('userId') userId: string) {
    return this.integrations.syncToMailchimp(userId);
  }

  // F-914: IP-Intelligence
  @Get('ip-intelligence')
  ipIntelligence(@Query('ip') ip: string) {
    return this.integrations.getIpIntelligence(ip ?? '127.0.0.1');
  }

  // F-911: Klaviyo-Segment
  @Post('klaviyo/sync')
  klaviyoSync(@Body('segment') segment: string) {
    return this.integrations.syncSegmentToKlaviyo(segment);
  }
}
