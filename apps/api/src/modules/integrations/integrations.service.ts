import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// F-887-F-913: Drittanbieter-Integrationen (Stubs)
@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  // F-911: Marketing-Automation (Mailchimp / Klaviyo stub)
  async syncToMailchimp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, role: true, createdAt: true },
    });
    if (!user) return { synced: false, error: 'user_not_found' };
    // In production: POST to Mailchimp Lists API or Klaviyo Profiles API
    return {
      synced: true,
      listId: process.env.MAILCHIMP_LIST_ID ?? 'stub-list-id',
      tags: [user.role],
      provider: 'mailchimp',
    };
  }

  // F-914: IP-Intelligence für Geo-Blocking
  async getIpIntelligence(ip: string) {
    // In production: call ipinfo.io / MaxMind GeoIP2
    return {
      ip,
      country: 'DE',
      countryName: 'Germany',
      region: 'Bavaria',
      city: 'Munich',
      isVpn: false,
      isTor: false,
      isBotnet: false,
      riskScore: 0,
      provider: 'stub',
    };
  }

  // F-887: Zapier Trigger Payload (informational)
  getZapierTriggers() {
    return {
      triggers: [
        { key: 'loan_created', label: 'New Loan Created', description: 'Fires when a user borrows a work' },
        { key: 'subscription_created', label: 'New Subscription', description: 'Fires when a user subscribes' },
        { key: 'work_published', label: 'Work Published', description: 'Fires when an artist publishes a work' },
        { key: 'payout_completed', label: 'Payout Completed', description: 'Fires when a payout is processed' },
        { key: 'review_submitted', label: 'Review Submitted', description: 'Fires when a user submits a review' },
      ],
      actions: [
        { key: 'send_notification', label: 'Send Notification', description: 'Send a push notification to a user' },
        { key: 'create_promo_code', label: 'Create Promo Code', description: 'Create a new promo code' },
      ],
    };
  }

  // F-893: LastFM-Scrobbling (stub)
  async scrobbleToLastFm(userId: string, workId: string) {
    return { scrobbled: false, provider: 'lastfm', message: 'Connect LastFM account in user settings to enable scrobbling' };
  }

  // F-895: Goodreads-Integration (stub)
  async getGoodreadsRecommendations(userId: string) {
    return { provider: 'goodreads', message: 'Connect Goodreads account to get book-based audiobook recommendations', recommendations: [] };
  }

  // F-898: Readwise-Integration (stub)
  async exportHighlightsToReadwise(userId: string) {
    const notes = await this.prisma.workNote.findMany({
      where: { userId },
      select: { body: true, work: { select: { title: true } } },
      take: 50,
    });
    return {
      provider: 'readwise',
      exportedCount: notes.length,
      message: 'Set READWISE_ACCESS_TOKEN to enable automatic sync',
      highlights: notes.map((n) => ({ text: n.body, title: n.work.title })),
    };
  }

  // F-904: Slack Bot (stub)
  getSlackBotInfo() {
    return {
      botName: 'CreatorLend Bot',
      commands: [
        { command: '/creatorlend recommend', description: 'Get a personalized recommendation' },
        { command: '/creatorlend borrow [work]', description: 'Borrow a work directly from Slack' },
        { command: '/creatorlend status', description: 'Check your active loans' },
      ],
      installUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/oauth/slack/install`,
      provider: 'slack',
    };
  }

  // F-911: Klaviyo Segment Sync (stub)
  async syncSegmentToKlaviyo(segment: string) {
    return { provider: 'klaviyo', segment, synced: false, message: 'Set KLAVIYO_API_KEY to enable sync' };
  }

  // F-876: API-Quota-Dashboard (per API-Key)
  async getApiQuota(userId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { userId, revokedAt: null } });
    return {
      userId,
      apiKeyId: key?.id ?? null,
      plan: 'free',
      limits: { requestsPerMinute: 100, requestsPerDay: 10_000 },
      usage: { requestsToday: 0, requestsThisMinute: 0 },
      resetAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }

  // F-871: API v2 Info
  getApiV2Info() {
    return {
      version: 'v2',
      baseUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/api/v2`,
      stable: false,
      status: 'beta',
      breaking_changes: ['snake_case response keys', 'cursor-based pagination'],
      migration_guide: 'https://docs.creatorlend.com/api/v2/migration',
    };
  }

  // F-882: API-Changelog und Deprecation-Policy
  getChangelog() {
    return {
      deprecationPolicy: '6 months notice before removal',
      currentVersion: 'v1',
      nextVersion: 'v2',
      entries: [
        { version: 'v1.0', date: '2025-01-01', changes: ['Initial release'] },
        { version: 'v1.1', date: '2025-04-01', changes: ['Added outgoing webhooks (F-883)', 'Added NPS surveys (F-809)'] },
        { version: 'v1.2', date: '2025-07-01', changes: ['Added AI endpoints (F-997-999)', 'Added PWA manifest (F-823)'] },
      ],
    };
  }
}
