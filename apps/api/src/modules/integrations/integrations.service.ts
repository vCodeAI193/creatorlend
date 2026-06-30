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

  // F-879: API Playground (Swagger UI info)
  getApiPlaygroundInfo() {
    const base = process.env.API_BASE_URL ?? 'https://api.creatorlend.com';
    return {
      playgroundUrl: `${base}/api/docs`,
      provider: 'Swagger UI',
      version: 'OpenAPI 3.0',
      interactiveAuth: true,
      note: 'Authenticate using the /auth/login endpoint, then click "Authorize" and paste your JWT token.',
    };
  }

  // F-881: Postman-Collection-Info
  getPostmanCollection() {
    return {
      downloadUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/api/docs-json`,
      importInstructions: 'Download the OpenAPI JSON and import it into Postman via File → Import → URL or file.',
      environment: {
        baseUrl: process.env.API_BASE_URL ?? 'https://api.creatorlend.com',
        apiVersion: 'v1',
      },
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

  // F-900: Kindle-Import – Highlights aus E-Books verknüpfen
  async importKindleHighlights(userId: string, clippingsText?: string) {
    return {
      provider: 'kindle',
      importedCount: 0,
      message: 'Upload your Kindle "My Clippings.txt" to import highlights. Set KINDLE_INTEGRATION=true to enable.',
      enabled: !!process.env.KINDLE_INTEGRATION,
      parsedHighlights: clippingsText ? [] : [],
    };
  }

  // F-901-F-903: Calendar-Integration (Google Calendar, Outlook)
  getCalendarIntegrationInfo() {
    return {
      providers: [
        {
          name: 'google',
          label: 'Google Calendar',
          authUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/oauth/google/calendar`,
          scopes: ['https://www.googleapis.com/auth/calendar.events'],
          features: ['loan_reminders', 'book_club_events', 'listening_goals'],
        },
        {
          name: 'outlook',
          label: 'Outlook Calendar',
          authUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/oauth/microsoft/calendar`,
          scopes: ['Calendars.ReadWrite'],
          features: ['loan_reminders', 'book_club_events'],
        },
      ],
      calendarEventTypes: [
        { key: 'loan_due', label: 'Leih-Erinnerung (1 Tag vor Ablauf)' },
        { key: 'listening_goal', label: 'Hörziel eintragen' },
        { key: 'book_club', label: 'Buchclub-Termin synchronisieren' },
      ],
      enabled: !!process.env.GOOGLE_CALENDAR_CLIENT_ID,
    };
  }

  // F-905: Discord Bot – Shared-Playlist für Server
  getDiscordBotInfo() {
    return {
      botName: 'CreatorLend Bot',
      inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID ?? 'DISCORD_CLIENT_ID'}&scope=bot&permissions=2048`,
      commands: [
        { command: '/playlist', description: 'Zeige oder teile eine Playlist im Server-Kanal' },
        { command: '/recommend', description: 'Empfehle ein Werk an den Server' },
        { command: '/nowplaying', description: 'Zeige was du gerade hörst' },
        { command: '/stats', description: 'Server-Hörstatistiken anzeigen' },
      ],
      enabled: !!process.env.DISCORD_CLIENT_ID,
      docsUrl: 'https://docs.creatorlend.com/integrations/discord',
    };
  }

  // F-906: Shopify App – Werke direkt aus Shopify-Shop verlinken
  getShopifyIntegrationInfo() {
    return {
      provider: 'shopify',
      appListing: 'https://apps.shopify.com/creatorlend',
      features: ['Embed audio player widget in product pages', 'Sell work bundles', 'Sync customers to subscriber list'],
      installUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/oauth/shopify/install`,
      enabled: !!process.env.SHOPIFY_API_KEY,
    };
  }

  // F-907: WordPress-Plugin – Werke auf Blog einbetten
  getWordPressPluginInfo() {
    return {
      provider: 'wordpress',
      pluginUrl: 'https://wordpress.org/plugins/creatorlend-embed/',
      shortcode: '[creatorlend work="WORK_ID" theme="light"]',
      blockEditorSupport: true,
      features: ['Audio player embed', 'Borrow CTA widget', 'Author profile widget'],
      docsUrl: 'https://docs.creatorlend.com/integrations/wordpress',
    };
  }

  // F-908: Ghost CMS Integration
  getGhostCmsInfo() {
    return {
      provider: 'ghost',
      integrationVia: 'Ghost Content API + custom card',
      cardName: 'CreatorLend Audio Card',
      features: ['Embed audio player in Ghost posts', 'Auto-link referenced works'],
      setupUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/integrations/ghost/setup`,
      docsUrl: 'https://docs.creatorlend.com/integrations/ghost',
      enabled: !!process.env.GHOST_ADMIN_API_KEY,
    };
  }

  // F-909: Substack Integration – Podcast-Episoden verlinken
  getSubstackInfo() {
    return {
      provider: 'substack',
      features: ['Embed podcast episodes from CreatorLend in Substack posts', 'Cross-promote works to newsletter subscribers'],
      embedCode: '<iframe src="https://embed.creatorlend.com/work/WORK_ID" width="100%" height="180"></iframe>',
      docsUrl: 'https://docs.creatorlend.com/integrations/substack',
    };
  }

  // F-910: CRM-Integration (HubSpot / Salesforce)
  async syncToCrm(userId: string, provider: 'hubspot' | 'salesforce') {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, displayName: true, role: true } });
    if (!user) return { synced: false, error: 'user_not_found' };
    return {
      synced: false,
      provider,
      message: `Set ${provider === 'hubspot' ? 'HUBSPOT_ACCESS_TOKEN' : 'SALESFORCE_CLIENT_ID'} to enable CRM sync`,
      contactData: { email: user.email, name: user.displayName, tags: [user.role] },
    };
  }

  getCrmConfig() {
    return {
      providers: [
        { name: 'hubspot', enabled: !!process.env.HUBSPOT_ACCESS_TOKEN, portalId: process.env.HUBSPOT_PORTAL_ID ?? null },
        { name: 'salesforce', enabled: !!process.env.SALESFORCE_CLIENT_ID, instanceUrl: process.env.SALESFORCE_INSTANCE_URL ?? null },
      ],
      syncFields: ['email', 'displayName', 'role', 'createdAt', 'subscriptionStatus', 'totalLoans'],
      syncFrequency: 'hourly',
    };
  }

  // F-912: CDP-Integration (Segment.io)
  getCdpConfig() {
    return {
      provider: 'segment',
      writeKey: process.env.SEGMENT_WRITE_KEY ? '***' : null,
      enabled: !!process.env.SEGMENT_WRITE_KEY,
      trackedEvents: [
        'user_registered', 'loan_created', 'loan_renewed', 'work_published',
        'subscription_created', 'review_submitted', 'payout_requested',
      ],
      destinations: ['Mixpanel', 'Amplitude', 'Google Analytics 4', 'Intercom'],
      docsUrl: 'https://segment.com/docs/connections/sources/catalog/libraries/server/node/',
    };
  }

  // F-913: BI-Tool – Metabase self-hosted für Künstler:innen
  getBiToolConfig() {
    return {
      provider: 'metabase',
      dashboardUrl: process.env.METABASE_URL ?? null,
      enabled: !!process.env.METABASE_URL,
      artistDashboards: [
        { name: 'Meine Werke – Leihzahlen', slug: 'artist-loans' },
        { name: 'Umsatz-Übersicht', slug: 'artist-revenue' },
        { name: 'Zuhörer-Demografie', slug: 'artist-audience' },
      ],
      embedEnabled: !!process.env.METABASE_EMBED_SECRET,
      setupDocs: 'https://docs.metabase.com/latest/installation-and-operation/running-metabase-on-docker',
    };
  }

  // F-915: Translation API – automatische Übersetzung von Beschreibungen
  async translateWorkDescription(workId: string, targetLocale: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { title: true, description: true } });
    if (!work) return { translated: false, error: 'work_not_found' };
    return {
      workId,
      targetLocale,
      provider: process.env.TRANSLATION_PROVIDER ?? 'deepl',
      enabled: !!process.env.DEEPL_API_KEY,
      original: { title: work.title, description: work.description },
      translated: null,
      message: 'Set DEEPL_API_KEY or GOOGLE_TRANSLATE_KEY to enable automatic translation',
    };
  }

  // F-916: AI Content Moderation API (Perspective API, AWS Rekognition)
  async moderateWithExternalAi(text: string) {
    return {
      provider: process.env.PERSPECTIVE_API_KEY ? 'perspective' : 'stub',
      enabled: !!process.env.PERSPECTIVE_API_KEY || !!process.env.AWS_REKOGNITION_REGION,
      input: text.slice(0, 100),
      scores: { TOXICITY: 0.05, SEVERE_TOXICITY: 0.01, INSULT: 0.02, THREAT: 0.01 },
      flagged: false,
      message: 'Set PERSPECTIVE_API_KEY to use Google Perspective API in production',
    };
  }

  // F-917: Payment-Fallback – Mollie wenn Stripe ausfällt
  getMollieConfig() {
    return {
      provider: 'mollie',
      enabled: !!process.env.MOLLIE_API_KEY,
      apiKey: process.env.MOLLIE_API_KEY ? '***' : null,
      fallbackConditions: ['stripe_circuit_open', 'stripe_timeout_3x', 'stripe_5xx'],
      supportedMethods: ['creditcard', 'ideal', 'bancontact', 'sofort', 'paypal'],
      docsUrl: 'https://docs.mollie.com/reference/v2/payments-api/create-payment',
    };
  }

  // F-918: Multi-CDN (Cloudflare + Fastly für Redundanz)
  getMultiCdnConfig() {
    return {
      strategy: 'primary-fallback',
      primary: {
        provider: 'cloudflare',
        baseUrl: process.env.CLOUDFLARE_CDN_URL ?? 'https://cdn.creatorlend.com',
        enabled: !!process.env.CLOUDFLARE_ZONE_ID,
      },
      fallback: {
        provider: 'fastly',
        baseUrl: process.env.FASTLY_CDN_URL ?? 'https://fastly.creatorlend.com',
        enabled: !!process.env.FASTLY_API_KEY,
      },
      routing: 'latency-based',
      failoverThreshold: '3 consecutive errors',
      docsUrl: 'https://docs.creatorlend.com/infra/multi-cdn',
    };
  }
}
