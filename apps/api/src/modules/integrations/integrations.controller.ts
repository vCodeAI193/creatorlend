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

  // F-879: API-Playground
  @Get('api/playground')
  apiPlayground() {
    return this.integrations.getApiPlaygroundInfo();
  }

  // F-881: Postman-Collection
  @Get('api/postman')
  postmanCollection() {
    return this.integrations.getPostmanCollection();
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

  // F-900: Kindle-Import
  @Post('kindle/import')
  @UseGuards(JwtAuthGuard)
  kindleImport(@CurrentUser() user: { userId: string }, @Body('clippingsText') clippingsText?: string) {
    return this.integrations.importKindleHighlights(user.userId, clippingsText);
  }

  // F-901-F-903: Calendar-Integration
  @Get('calendar')
  calendarInfo() {
    return this.integrations.getCalendarIntegrationInfo();
  }

  // F-905: Discord Bot
  @Get('discord')
  discordBot() {
    return this.integrations.getDiscordBotInfo();
  }

  // F-906: Shopify
  @Get('shopify')
  shopifyInfo() {
    return this.integrations.getShopifyIntegrationInfo();
  }

  // F-907: WordPress Plugin
  @Get('wordpress')
  wordpressInfo() {
    return this.integrations.getWordPressPluginInfo();
  }

  // F-908: Ghost CMS
  @Get('ghost')
  ghostInfo() {
    return this.integrations.getGhostCmsInfo();
  }

  // F-909: Substack
  @Get('substack')
  substackInfo() {
    return this.integrations.getSubstackInfo();
  }

  // F-910: CRM Config
  @Get('crm')
  crmConfig() {
    return this.integrations.getCrmConfig();
  }

  // F-912: CDP (Segment.io)
  @Get('cdp')
  cdpConfig() {
    return this.integrations.getCdpConfig();
  }

  // F-913: BI-Tool Metabase
  @Get('bi')
  biToolConfig() {
    return this.integrations.getBiToolConfig();
  }

  // F-915: Translation API
  @Get('translate/:workId')
  @UseGuards(JwtAuthGuard)
  translateWork(
    @Param('workId') workId: string,
    @Query('locale') locale: string,
  ) {
    return this.integrations.translateWorkDescription(workId, locale ?? 'en');
  }

  // F-918: Multi-CDN config
  @Get('multi-cdn')
  multiCdn() {
    return this.integrations.getMultiCdnConfig();
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

  // F-910: CRM-Sync für einzelnen User
  @Post('crm/:provider/sync/:userId')
  crmSync(@Param('provider') provider: string, @Param('userId') userId: string) {
    return this.integrations.syncToCrm(userId, provider as 'hubspot' | 'salesforce');
  }

  // F-916: AI Content Moderation API
  @Post('ai-moderation')
  aiModerate(@Body('text') text: string) {
    return this.integrations.moderateWithExternalAi(text ?? '');
  }

  // F-917: Mollie Payment Fallback
  @Get('mollie')
  mollieConfig() {
    return this.integrations.getMollieConfig();
  }
}
