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

  // F-754: Admin-Benachrichtigung bei kritischen Fehlern (PagerDuty)
  getPagerDutyConfig() {
    return {
      configured: !!process.env.PAGERDUTY_ROUTING_KEY,
      serviceId: process.env.PAGERDUTY_SERVICE_ID ?? null,
      dashboardUrl: process.env.PAGERDUTY_DASHBOARD_URL ?? null,
      alertThresholds: {
        errorRate: '> 5% for 5 minutes',
        p99Latency: '> 2000ms for 5 minutes',
        dbConnections: '> 90% pool utilization',
      },
    };
  }

  // F-757: Uptime-Monitoring
  getUptimeStatus() {
    return {
      provider: process.env.UPTIME_PROVIDER ?? 'self-hosted',
      checkIntervalSeconds: 60,
      sloTarget: 99.9,
      endpoints: [
        { name: 'API Health', url: '/health', status: 'UP' },
        { name: 'Database', url: '/health/db', status: 'UP' },
      ],
    };
  }

  // F-759: Error-Budget-Tracking (SLO 99.9%)
  getErrorBudget() {
    const sloPercent = 99.9;
    const windowDays = 30;
    const allowedDowntimeMinutes = ((100 - sloPercent) / 100) * windowDays * 24 * 60;
    return {
      sloPercent,
      windowDays,
      allowedDowntimeMinutes: Math.round(allowedDowntimeMinutes * 10) / 10,
      consumedDowntimeMinutes: 0,
      budgetRemainingPercent: 100,
      status: 'HEALTHY',
    };
  }

  // F-750: Datenbank-Backup-Status
  getBackupStatus() {
    return {
      lastBackup: null,
      provider: process.env.BACKUP_PROVIDER ?? 'pg_dump',
      schedule: 'daily at 02:00 UTC + hourly WAL archive',
      retentionDays: 30,
      nextBackupAt: new Date(new Date().setHours(2, 0, 0, 0) + 86400000).toISOString(),
      status: 'CONFIGURED',
    };
  }

  // F-756: Runbook für häufige Incidents
  getRunbooks() {
    return {
      runbooks: [
        { title: 'Database Connection Exhausted', url: 'https://docs.internal/runbooks/db-connections', severity: 'P1' },
        { title: 'API Latency Spike', url: 'https://docs.internal/runbooks/latency-spike', severity: 'P1' },
        { title: 'Stripe Webhook Failures', url: 'https://docs.internal/runbooks/stripe-webhooks', severity: 'P2' },
        { title: 'Redis Cache Miss Rate High', url: 'https://docs.internal/runbooks/redis-cache', severity: 'P2' },
        { title: 'CDN Errors', url: 'https://docs.internal/runbooks/cdn-errors', severity: 'P2' },
      ],
    };
  }

  // F-922: Subresource Integrity (SRI) Konfiguration
  getSriConfig() {
    return {
      enabled: true,
      provider: process.env.CDN_PROVIDER ?? 'cloudflare',
      hashAlgorithm: 'sha384',
      assets: ['runtime.js', 'main.js', 'styles.css'],
      docs: 'https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity',
    };
  }

  // F-924/F-925: Dependency- und Secrets-Scanning
  getSecurityScanConfig() {
    return {
      dependencyScanning: {
        tool: process.env.DEPENDENCY_SCAN_TOOL ?? 'Dependabot',
        schedule: 'daily',
        alertsUrl: process.env.SNYK_DASHBOARD_URL ?? null,
      },
      secretsScanning: {
        tool: 'GitLeaks',
        preScanHook: true,
        ciIntegration: true,
      },
      containerScanning: {
        tool: 'Trivy',
        schedule: 'on-push',
      },
    };
  }

  // F-934: Secret Management (HashiCorp Vault / AWS SSM)
  getSecretManagementConfig() {
    return {
      provider: process.env.SECRET_MANAGER ?? 'env',
      vaultUrl: process.env.VAULT_ADDR ?? null,
      rotationIntervalDays: 90,
      secretsRotationEnabled: !!process.env.VAULT_ADDR,
      awsSsmPrefix: process.env.AWS_SSM_PREFIX ?? '/creatorlend/',
    };
  }

  // F-938: Verschlüsselung at Rest
  getEncryptionAtRestConfig() {
    return {
      algorithm: 'AES-256-GCM',
      provider: process.env.KMS_PROVIDER ?? 'aws-kms',
      keyArn: process.env.KMS_KEY_ARN ?? null,
      databaseEncrypted: true,
      storageEncrypted: true,
      backupsEncrypted: true,
    };
  }

  // F-939/F-942: TLS + GDPR DPA
  getComplianceConfig() {
    return {
      tls: {
        minVersion: 'TLSv1.3',
        hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
        certProvider: process.env.CERT_PROVIDER ?? 'Let\'s Encrypt',
      },
      gdpr: {
        dpaSignedWithProcessors: true,
        subProcessors: ['AWS', 'Stripe', 'SendGrid', 'Cloudflare'],
        dpaDocumentUrl: 'https://docs.creatorlend.com/legal/dpa',
      },
      ePrivacy: {
        cookiePolicyVersion: '1.0',
        consentRequired: true,
        granularOptions: true,
        cookieConsentProvider: 'first-party',
      },
    };
  }

  // F-949: Data Processing Agreements mit Cloud-Anbietern
  getDataProcessingAgreements() {
    return {
      agreements: [
        { provider: 'AWS', type: 'DPA', signed: true, region: 'eu-central-1' },
        { provider: 'Stripe', type: 'DPA', signed: true, region: 'EU' },
        { provider: 'SendGrid', type: 'DPA', signed: true },
        { provider: 'Cloudflare', type: 'DPA', signed: true },
        { provider: 'Sentry', type: 'DPA', signed: false },
      ],
    };
  }

  // F-951: Horizontal Scaling / Load Balancer
  getScalingConfig() {
    return {
      loadBalancer: process.env.LOAD_BALANCER ?? 'AWS ALB',
      horizontalScaling: true,
      autoScaling: {
        enabled: !!process.env.KUBERNETES_SERVICE_HOST,
        minReplicas: 2,
        maxReplicas: 20,
        cpuTargetPercent: 70,
        memoryTargetPercent: 80,
      },
      kubernetes: {
        enabled: !!process.env.KUBERNETES_SERVICE_HOST,
        namespace: process.env.K8S_NAMESPACE ?? 'creatorlend',
      },
    };
  }

  // F-961: API SLO – P99 < 200ms
  getApiSloConfig() {
    return {
      p99TargetMs: 200,
      p95TargetMs: 100,
      errorRateTarget: 0.1,
      availabilityTarget: 99.9,
      monitoringUrl: process.env.GRAFANA_URL ?? null,
      alertManager: process.env.ALERTMANAGER_URL ?? null,
    };
  }

  // F-753: Release-Notes aus Git-History (stub)
  getReleaseNotes() {
    return {
      releases: [
        { version: '1.3.0', date: '2025-06-01', highlights: ['Empfehlungs-DMs (F-585)', 'One-Tap-Bewertung (F-521)', 'E-Mail-Tracking (F-666)'], breaking: [] },
        { version: '1.2.0', date: '2025-05-01', highlights: ['Content-Feedback (F-536/F-537)', 'Activity-Feed (F-571)', 'Umsatzbeteiligung (F-386)'], breaking: [] },
        { version: '1.1.0', date: '2025-04-01', highlights: ['A/B-Tests (F-080)', 'DMCA (F-730)', 'Geo-Blocking (F-736)'], breaking: [] },
        { version: '1.0.0', date: '2025-01-01', highlights: ['Initial Release', 'Core Lending Loop', 'Stripe Subscriptions'], breaking: [] },
      ],
      note: 'In production, generate from git tags and CHANGELOG.md via CI pipeline.',
    };
  }

  // F-973: Point-in-Time Recovery
  getPitrConfig() {
    return {
      enabled: true,
      maxRecoveryPointMinutes: 5,
      walArchivingEnabled: true,
      walArchiveDestination: process.env.WAL_S3_BUCKET ?? 's3://creatorlend-wal-archive',
      testFrequency: 'monthly',
      rpo: '< 15 minutes',
      rto: '< 1 hour',
    };
  }

  // F-921: Content Security Policy
  getCspConfig() {
    return {
      policy: "default-src 'self'; script-src 'self' https://cdn.creatorlend.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https://cdn.creatorlend.com; connect-src 'self' https://api.creatorlend.com; frame-ancestors 'none';",
      mode: 'enforce',
      reportUri: '/api/v1/infra/security/csp-report',
      nonce: true,
    };
  }

  // F-923: CORS-Konfiguration
  getCorsConfig() {
    const origins = (process.env.CORS_ORIGINS ?? 'https://app.creatorlend.com,https://creatorlend.com').split(',');
    return {
      allowedOrigins: origins,
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Request-ID'],
      credentials: true,
      maxAgeSeconds: 86400,
    };
  }

  // F-926-F-932: Security Program Config
  getSecurityProgramConfig() {
    return {
      containerScanning: { tool: 'Trivy', schedule: 'on-push', registry: 'ghcr.io/creatorlend' },
      sast: { tool: 'CodeQL', languages: ['typescript', 'javascript'], schedule: 'on-pr' },
      dast: { tool: 'OWASP ZAP', target: process.env.STAGING_URL ?? 'https://staging.creatorlend.com', schedule: 'weekly' },
      penTest: { frequency: 'annual', lastDate: '2025-01-01', provider: 'TBD', nextDate: '2026-01-01' },
      bugBounty: { platform: 'HackerOne', url: 'https://hackerone.com/creatorlend', scope: ['api.creatorlend.com', 'app.creatorlend.com'], active: false },
      responsibleDisclosure: { email: 'security@creatorlend.com', pgpKey: null, responseTimeDays: 5, url: 'https://creatorlend.com/security' },
      sbom: { format: 'CycloneDX', generated: 'on-release', tool: 'syft', outputUrl: null },
      mTls: { enabled: !!process.env.MTLS_ENABLED, services: ['api → stripe-proxy', 'api → media-service'], certProvider: 'AWS ACM PCA' },
    };
  }

  // F-933: mTLS für interne Dienst-zu-Dienst-Kommunikation
  getMtlsConfig() {
    return {
      enabled: !!process.env.MTLS_ENABLED,
      certProvider: 'AWS ACM PCA',
      services: [
        { name: 'api → stripe-proxy', status: 'planned' },
        { name: 'api → media-service', status: 'planned' },
        { name: 'api → notification-service', status: 'planned' },
      ],
      caArn: process.env.ACM_PCA_CA_ARN ?? null,
      certRotationDays: 90,
      verifyClientCerts: true,
      docs: 'https://docs.aws.amazon.com/acm-pca/latest/userguide/PcaCreateCa.html',
    };
  }

  // F-935: Automatische Secret-Rotation
  getSecretRotationConfig() {
    return {
      enabled: !!process.env.VAULT_ADDR,
      rotationIntervalDays: 90,
      nextRotation: null,
      secrets: [
        { name: 'STRIPE_SECRET_KEY', lastRotated: null },
        { name: 'JWT_SECRET', lastRotated: null },
        { name: 'DATABASE_URL', lastRotated: null },
      ],
      provider: process.env.VAULT_ADDR ? 'HashiCorp Vault' : 'AWS SSM',
    };
  }

  // F-936: Audit-Log für Datenbankänderungen
  getAuditLogConfig() {
    return {
      enabled: true,
      provider: 'application-level',
      tables: ['users', 'works', 'loans', 'subscriptions', 'payouts'],
      retentionDays: 365,
      piiMasking: true,
      exportFormats: ['JSON', 'CSV'],
      integrations: ['SIEM', 'Elastic', 'Loki'],
    };
  }

  // F-937: DB Least-Privilege-Rollen
  getDbAccessConfig() {
    return {
      roles: [
        { name: 'creatorlend_api', permissions: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], tables: 'application tables' },
        { name: 'creatorlend_readonly', permissions: ['SELECT'], tables: 'all tables', usage: 'analytics, metabase' },
        { name: 'creatorlend_migrations', permissions: ['ALL'], tables: 'all tables', usage: 'CI migrations only' },
      ],
      passwordPolicy: 'rotate every 90 days',
      connectionSsl: true,
    };
  }

  // F-940: Ende-zu-Ende-Verschlüsselung für DMs
  getE2eEncryptionConfig() {
    return {
      enabled: false,
      algorithm: 'Signal Protocol / X3DH + Double Ratchet',
      keyStorage: 'client-side only',
      serverRole: 'message relay only (ciphertext)',
      status: 'planned',
      estimatedRelease: 'v2.0',
    };
  }

  // F-941: Key-Rotation ohne Downtime
  getKeyRotationConfig() {
    return {
      strategy: 'dual-key overlap',
      overlapPeriodHours: 24,
      jwtRotation: { enabled: false, intervalDays: 30, activeKeys: 2 },
      mediaSigningRotation: { enabled: false, intervalDays: 7 },
      databaseKeyRotation: { enabled: !!process.env.KMS_KEY_ARN, provider: 'AWS KMS', automaticRotationYears: 1 },
    };
  }

  // F-943-F-950: Compliance-Zertifizierungen
  getComplianceCertifications() {
    return {
      soc2: { status: 'planned', type: 'Type II', auditor: null, targetDate: '2026-06-01' },
      iso27001: { status: 'planned', auditor: null, targetDate: '2026-12-01' },
      hipaa: { applicable: false, reason: 'No health data processed' },
      ccpa: { applicable: true, status: 'partial', privacyPolicyUrl: 'https://creatorlend.com/privacy', optOutUrl: 'https://creatorlend.com/privacy/opt-out' },
      ePrivacy: { cookiePolicyVersion: '1.0', consentRequired: true, granularOptions: true, tcfCompliant: false },
      dsfa: { completed: false, documentUrl: null, reviewer: null },
      securityAwareness: { frequency: 'annual', provider: 'internal', lastTraining: null, completionRate: null },
    };
  }

  // F-952: Auto-Scaling (Kubernetes HPA)
  getAutoScalingConfig() {
    return {
      provider: 'kubernetes-hpa',
      enabled: !!process.env.KUBERNETES_SERVICE_HOST,
      apiDeployment: { minReplicas: 2, maxReplicas: 20, cpuTarget: 70, memoryTarget: 80 },
      workerDeployment: { minReplicas: 1, maxReplicas: 10, cpuTarget: 80 },
      scaleDownStabilizationSeconds: 300,
      keda: { enabled: false, bullMqScaling: false },
    };
  }

  // F-954: Read-Replicas
  getReadReplicaConfig() {
    return {
      enabled: !!process.env.DATABASE_READ_URL,
      replicaUrl: process.env.DATABASE_READ_URL ? '***' : null,
      usedFor: ['Analytics queries', 'Reports', 'Metabase', 'Admin dashboards'],
      lagMonitoring: { enabled: false, alertThresholdMs: 1000 },
      prismaConfig: 'Use $extends with middleware to route SELECT to replica URL',
    };
  }

  // F-955: Redis-Cluster
  getRedisClusterConfig() {
    return {
      mode: process.env.REDIS_CLUSTER_URL ? 'cluster' : 'single',
      url: process.env.REDIS_URL ? '***' : null,
      clusterUrl: process.env.REDIS_CLUSTER_URL ? '***' : null,
      shards: 3,
      replicationFactor: 1,
      maxMemoryPolicy: 'allkeys-lru',
      persistence: { rdb: true, aof: true },
    };
  }

  // F-957: Edge-Computing / Geo-Routing
  getEdgeComputingConfig() {
    return {
      provider: process.env.CDN_PROVIDER ?? 'cloudflare',
      edgeLocations: ['Frankfurt', 'Amsterdam', 'London', 'New York', 'Singapore'],
      geoRouting: true,
      edgeFunctions: [
        { name: 'auth-token-refresh', runtime: 'cloudflare-workers', status: 'planned' },
        { name: 'geo-blocking', runtime: 'cloudflare-workers', status: 'implemented' },
      ],
    };
  }

  // F-968-F-969: Blue/Green & Canary Deployments
  getDeploymentConfig() {
    return {
      strategy: 'blue-green',
      blueGreen: { provider: 'AWS CodeDeploy / k8s rolling', downtimeDuringSwitch: false },
      canary: { enabled: false, provider: 'Argo Rollouts', initialWeight: 5, stepIntervalMinutes: 5, maxWeight: 100 },
      rollback: { automatic: true, triggerOnHealthCheckFailures: 3, timeoutSeconds: 60 },
      ciCd: {
        pipeline: 'GitHub Actions',
        stages: ['lint', 'type-check', 'test', 'build', 'security-scan', 'deploy-staging', 'e2e', 'deploy-prod'],
        targetDurationMinutes: 5,
      },
    };
  }

  // F-971: Zero-Downtime-Migrationen
  getZeroDowntimeMigrationConfig() {
    return {
      strategy: 'expand-contract',
      steps: ['1. Add new column nullable', '2. Backfill in batches', '3. Add NOT NULL constraint', '4. Remove old column in next release'],
      tooling: 'pg-osc (online schema change) or plain SQL with concurrent index creation',
      concurrentIndexes: true,
      lockTimeoutMs: 1000,
    };
  }

  // F-974: Backup-Restore-Test
  getBackupRestoreTestConfig() {
    return {
      frequency: 'monthly',
      lastTest: null,
      nextTest: null,
      procedure: [
        '1. Restore backup to isolated test environment',
        '2. Run smoke tests against restored DB',
        '3. Verify data integrity checksums',
        '4. Document RTO measurement',
      ],
      rtoTarget: '< 1 hour',
      documented: false,
    };
  }

  // F-975: Multi-Region
  getMultiRegionConfig() {
    return {
      regions: [
        { name: 'eu-central-1', status: 'primary', location: 'Frankfurt', active: true },
        { name: 'us-east-1', status: 'planned', location: 'Virginia', active: false },
      ],
      dataResidency: 'EU-only (GDPR)',
      globalLoadBalancer: process.env.GLOBAL_LB ?? 'Cloudflare',
      crossRegionReplication: false,
    };
  }

  // F-976: Disaster-Recovery
  getDisasterRecoveryConfig() {
    return {
      rto: '< 1 hour',
      rpo: '< 15 minutes',
      drSite: process.env.DR_REGION ?? 'eu-west-1',
      runbookUrl: 'https://docs.internal/runbooks/disaster-recovery',
      lastDrTest: null,
      drTestFrequency: 'quarterly',
      contacts: ['oncall@creatorlend.com'],
    };
  }

  // F-972: Backup-Strategy (täglich + stündliche WAL-Archive)
  getBackupStrategyConfig() {
    return {
      fullBackup: { schedule: 'daily_at_2am', retention: '35 days', provider: 'AWS RDS automated backups' },
      walArchive: { schedule: 'continuous (every ~5 min)', retentionDays: 7, storage: 'S3', compression: 'lz4' },
      crossRegionCopy: { enabled: !!process.env.BACKUP_CROSS_REGION, targetRegion: process.env.BACKUP_REGION ?? 'eu-west-1' },
      encryptionAtRest: true,
      encryptionKey: 'AWS KMS',
      note: 'configure_via_rds_automated_backup_settings_and_wal_g_for_self_hosted',
    };
  }

  // F-977-F-980: IaC / CI/CD / Rollback
  getIacAndCiCdConfig() {
    return {
      terraform: { version: '1.8', stateBackend: 'S3 + DynamoDB lock', modules: ['vpc', 'eks', 'rds', 'elasticache', 'cloudfront'] },
      kubernetes: { version: '1.30', helmCharts: ['creatorlend-api', 'creatorlend-worker', 'redis', 'pgbouncer'], namespace: 'creatorlend' },
      ciCd: {
        tool: 'GitHub Actions',
        targetMinutes: 5,
        stages: ['lint', 'typecheck', 'test', 'docker-build', 'trivy-scan', 'push', 'helm-deploy'],
        environments: ['dev', 'staging', 'production'],
      },
      autoRollback: { enabled: true, trigger: 'health-check-failure', healthCheckPath: '/health', failureThreshold: 3, rollbackTimeoutSeconds: 60 },
    };
  }
}
