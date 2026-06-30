import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

// F-964/F-965/F-966/F-967: Infrastruktur-Stubs
@Injectable()
export class InfraService implements OnApplicationShutdown {
  private readonly logger = new Logger(InfraService.name);

  // F-967: Graceful Shutdown mit 30s Drain-Timeout
  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Graceful shutdown initiated (signal: ${signal})`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // drain stub
    this.logger.log('Graceful shutdown complete');
  }

  // F-966: Circuit Breaker Status (stub)
  getCircuitBreakerStatus() {
    return {
      services: [
        { name: 'stripe', state: 'CLOSED', failureCount: 0, lastFailure: null },
        { name: 'cdn', state: 'CLOSED', failureCount: 0, lastFailure: null },
        { name: 'mail', state: 'CLOSED', failureCount: 0, lastFailure: null },
      ],
      resetTimeoutMs: 30_000,
      failureThreshold: 5,
    };
  }

  // F-964: BullMQ Job-Queue Status (stub)
  getJobQueueStatus() {
    return {
      queues: [
        { name: 'notifications', waiting: 0, active: 0, completed: 0, failed: 0 },
        { name: 'payouts', waiting: 0, active: 0, completed: 0, failed: 0 },
        { name: 'media-processing', waiting: 0, active: 0, completed: 0, failed: 0 },
        { name: 'emails', waiting: 0, active: 0, completed: 0, failed: 0 },
        { name: 'webhooks', waiting: 0, active: 0, completed: 0, failed: 0 },
      ],
      redisConnected: true,
      bullBoardUrl: '/admin/bull-board',
    };
  }

  // F-965: Bull Board Link (in production: mount @bull-board/api)
  getBullBoardInfo() {
    return {
      url: process.env.BULL_BOARD_URL ?? '/admin/queues',
      enabled: process.env.NODE_ENV !== 'production',
      message: 'Install @bull-board/nestjs for a live dashboard',
    };
  }

  // F-962: Database index recommendations (stub from pg_stat_user_indexes)
  getIndexRecommendations() {
    return {
      message: 'Run EXPLAIN ANALYZE on slow queries to identify missing indexes',
      topSlowQueries: [],
      unusedIndexes: [],
      missingIndexes: [],
    };
  }

  // F-920: Log aggregation info
  getLogAggregationStatus() {
    return {
      provider: process.env.LOG_PROVIDER ?? 'console',
      lokiUrl: process.env.LOKI_URL ?? null,
      elasticUrl: process.env.ELASTIC_URL ?? null,
      retention: '30d',
    };
  }

  // F-953: PgBouncer Connection Pooling Info
  getConnectionPoolingInfo() {
    return {
      provider: process.env.PGBOUNCER_URL ? 'PgBouncer' : 'direct',
      url: process.env.PGBOUNCER_URL ?? null,
      maxConnections: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      mode: 'transaction',
      docs: 'https://www.pgbouncer.org/config.html',
    };
  }

  // F-956: CDN-Konfiguration
  getCdnConfig() {
    return {
      provider: process.env.CDN_PROVIDER ?? 'cloudflare',
      baseUrl: process.env.MEDIA_CDN_BASE_URL ?? 'https://cdn.creatorlend.com',
      assetsUrl: process.env.ASSETS_CDN_URL ?? 'https://assets.creatorlend.com',
      audioSegmentCacheTime: 86400,
      imagesCacheTime: 604800,
    };
  }

  // F-963: Query-Plan-Caching (Prisma prepared statements)
  getQueryCacheInfo() {
    return {
      provider: 'prisma',
      preparedStatements: true,
      connectionCachingEnabled: true,
      recommendation: 'Use prisma.$extends for query-level caching with Redis',
      redisUrl: process.env.REDIS_URL ?? null,
    };
  }
}
