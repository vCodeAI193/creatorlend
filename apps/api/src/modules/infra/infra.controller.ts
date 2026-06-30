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
}
