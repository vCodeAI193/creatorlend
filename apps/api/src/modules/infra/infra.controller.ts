import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InfraService } from './infra.service';
import { UserRole } from '@creatorlend/shared';

@Controller('admin/infra')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InfraController {
  constructor(private readonly infra: InfraService) {}

  // F-966: Circuit-Breaker-Status
  @Get('circuit-breakers')
  circuitBreakers() {
    return this.infra.getCircuitBreakerStatus();
  }

  // F-964/F-965: Job-Queue-Status
  @Get('queues')
  queues() {
    return this.infra.getJobQueueStatus();
  }

  @Get('queues/board')
  bullBoard() {
    return this.infra.getBullBoardInfo();
  }

  // F-962: Index-Empfehlungen
  @Get('db/indexes')
  dbIndexes() {
    return this.infra.getIndexRecommendations();
  }

  // F-920: Log-Aggregation
  @Get('logs')
  logs() {
    return this.infra.getLogAggregationStatus();
  }

  // F-953: PgBouncer Connection Pooling
  @Get('db/connection-pooling')
  connectionPooling() {
    return this.infra.getConnectionPoolingInfo();
  }

  // F-956: CDN-Konfiguration
  @Get('cdn')
  cdnConfig() {
    return this.infra.getCdnConfig();
  }

  // F-963: Query-Plan-Caching
  @Get('db/query-cache')
  queryCache() {
    return this.infra.getQueryCacheInfo();
  }

  // F-754: PagerDuty-Konfiguration
  @Get('pagerduty')
  pagerduty() {
    return this.infra.getPagerDutyConfig();
  }

  // F-757: Uptime-Status
  @Get('uptime')
  uptime() {
    return this.infra.getUptimeStatus();
  }

  // F-759: Error-Budget
  @Get('error-budget')
  errorBudget() {
    return this.infra.getErrorBudget();
  }

  // F-750: Backup-Status
  @Get('backup')
  backup() {
    return this.infra.getBackupStatus();
  }

  // F-756: Runbooks
  @Get('runbooks')
  runbooks() {
    return this.infra.getRunbooks();
  }

  // F-922: SRI-Konfiguration
  @Get('security/sri')
  sriConfig() {
    return this.infra.getSriConfig();
  }

  // F-924/F-925: Dependency- und Secrets-Scanning
  @Get('security/scanning')
  securityScanning() {
    return this.infra.getSecurityScanConfig();
  }

  // F-934: Secret-Management
  @Get('security/secrets')
  secretManagement() {
    return this.infra.getSecretManagementConfig();
  }

  // F-938: Verschlüsselung at Rest
  @Get('security/encryption')
  encryptionConfig() {
    return this.infra.getEncryptionAtRestConfig();
  }

  // F-939/F-942: TLS + GDPR-Compliance
  @Get('security/compliance')
  complianceConfig() {
    return this.infra.getComplianceConfig();
  }

  // F-949: Data Processing Agreements
  @Get('security/dpa')
  dataProcessingAgreements() {
    return this.infra.getDataProcessingAgreements();
  }

  // F-951: Horizontal Scaling
  @Get('scaling')
  scalingConfig() {
    return this.infra.getScalingConfig();
  }

  // F-961: API SLO
  @Get('slo')
  apiSlo() {
    return this.infra.getApiSloConfig();
  }

  // F-973: Point-in-Time Recovery
  @Get('db/pitr')
  pitrConfig() {
    return this.infra.getPitrConfig();
  }

  // F-753: Release-Notes aus Git-History
  @Get('release-notes')
  releaseNotes() {
    return this.infra.getReleaseNotes();
  }

  // F-921: CSP-Konfiguration
  @Get('security/csp')
  cspConfig() {
    return this.infra.getCspConfig();
  }

  // F-923: CORS-Konfiguration
  @Get('security/cors')
  corsConfig() {
    return this.infra.getCorsConfig();
  }

  // F-926-F-932: Security Program (SAST, DAST, Bug Bounty, etc.)
  @Get('security/program')
  securityProgram() {
    return this.infra.getSecurityProgramConfig();
  }

  // F-935: Secret-Rotation
  @Get('security/secret-rotation')
  secretRotation() {
    return this.infra.getSecretRotationConfig();
  }

  // F-936: Audit-Log-Konfiguration
  @Get('security/audit-log')
  auditLogConfig() {
    return this.infra.getAuditLogConfig();
  }

  // F-937: DB Least-Privilege
  @Get('db/access')
  dbAccessConfig() {
    return this.infra.getDbAccessConfig();
  }

  // F-940: E2E-Verschlüsselung für DMs
  @Get('security/e2e-encryption')
  e2eEncryption() {
    return this.infra.getE2eEncryptionConfig();
  }

  // F-941: Key-Rotation
  @Get('security/key-rotation')
  keyRotation() {
    return this.infra.getKeyRotationConfig();
  }

  // F-943-F-950: Compliance-Zertifizierungen
  @Get('security/certifications')
  complianceCertifications() {
    return this.infra.getComplianceCertifications();
  }

  // F-952: Auto-Scaling (HPA)
  @Get('scaling/auto')
  autoScaling() {
    return this.infra.getAutoScalingConfig();
  }

  // F-954: Read-Replicas
  @Get('db/read-replicas')
  readReplicas() {
    return this.infra.getReadReplicaConfig();
  }

  // F-955: Redis-Cluster
  @Get('db/redis-cluster')
  redisCluster() {
    return this.infra.getRedisClusterConfig();
  }

  // F-957: Edge-Computing
  @Get('edge')
  edgeComputing() {
    return this.infra.getEdgeComputingConfig();
  }

  // F-968-F-969: Deployment-Strategie (Blue/Green, Canary)
  @Get('deployment')
  deploymentConfig() {
    return this.infra.getDeploymentConfig();
  }

  // F-971: Zero-Downtime-Migrationen
  @Get('db/zero-downtime-migrations')
  zeroDowntimeMigrations() {
    return this.infra.getZeroDowntimeMigrationConfig();
  }

  // F-974: Backup-Restore-Test
  @Get('backup/restore-test')
  backupRestoreTest() {
    return this.infra.getBackupRestoreTestConfig();
  }

  // F-975: Multi-Region
  @Get('regions')
  multiRegion() {
    return this.infra.getMultiRegionConfig();
  }

  // F-976: Disaster-Recovery
  @Get('disaster-recovery')
  disasterRecovery() {
    return this.infra.getDisasterRecoveryConfig();
  }

  // F-972: Backup-Strategy
  @Get('backup-strategy')
  backupStrategy() {
    return this.infra.getBackupStrategyConfig();
  }

  // F-933: mTLS Konfiguration
  @Get('security/mtls')
  mtlsConfig() {
    return this.infra.getMtlsConfig();
  }

  // F-977-F-980: IaC, CI/CD, Auto-Rollback
  @Get('iac')
  iacAndCiCd() {
    return this.infra.getIacAndCiCdConfig();
  }
}
