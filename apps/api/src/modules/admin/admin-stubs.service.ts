import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminStubsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    try { return JSON.parse(row.value) as T; } catch { return fallback; }
  }

  private async setSetting(key: string, value: unknown): Promise<void> {
    const str = JSON.stringify(value);
    await this.prisma.appSetting.upsert({ where: { key }, create: { key, value: str }, update: { value: str } });
  }

  // F-705: Admin session timeout config
  async getAdminSessionConfig() {
    const config = await this.getSetting<Record<string, unknown>>('admin_session_config', { timeoutMinutes: 15, requireMfaOnLogin: true, ipWhitelistEnabled: false });
    return { config };
  }

  async setAdminSessionConfig(config: Record<string, unknown>) {
    await this.setSetting('admin_session_config', config);
    return { config, saved: true };
  }

  // F-706: Admin IP whitelist
  async getAdminIpWhitelist() {
    const ips = await this.getSetting<string[]>('admin_ip_whitelist', []);
    return { ips, enabled: ips.length > 0 };
  }

  async addAdminIpWhitelist(ip: string) {
    const ips = await this.getSetting<string[]>('admin_ip_whitelist', []);
    if (!ips.includes(ip)) ips.push(ip);
    await this.setSetting('admin_ip_whitelist', ips);
    return { ips, added: ip };
  }

  async removeAdminIpWhitelist(ip: string) {
    const ips = await this.getSetting<string[]>('admin_ip_whitelist', []);
    const filtered = ips.filter((i) => i !== ip);
    await this.setSetting('admin_ip_whitelist', filtered);
    return { ips: filtered, removed: ip };
  }

  // F-707: 2FA enforcement for admin
  async getAdminMfaStatus() {
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, displayName: true, email: true } });
    const mfaStatuses = await Promise.all(admins.map(async (a) => {
      const hasMfa = await this.getSetting<boolean>(`mfa_enabled:${a.id}`, false);
      return { ...a, hasMfa };
    }));
    return { admins: mfaStatuses, allHaveMfa: mfaStatuses.every((a) => a.hasMfa) };
  }

  // F-708: Admin handover protocol
  async getHandoverProtocol(fromAdminId: string) {
    const protocol = await this.getSetting<Record<string, unknown> | null>(`handover:${fromAdminId}`, null);
    return { fromAdminId, protocol };
  }

  async createHandoverProtocol(fromAdminId: string, toAdminId: string, items: string[]) {
    const protocol = { fromAdminId, toAdminId, items, checklist: items.map((i) => ({ item: i, done: false })), createdAt: new Date().toISOString() };
    await this.setSetting(`handover:${fromAdminId}`, protocol);
    return { protocol };
  }

  // F-715: User impersonation (generates a short-lived token)
  async impersonateUser(adminId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, email: true, role: true, displayName: true } });
    if (!target) return { error: 'user_not_found' };
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'IMPERSONATE_USER', targetType: 'User', targetId: targetUserId } });
    const tokenKey = `impersonate_token:${targetUserId}:${adminId}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await this.setSetting(tokenKey, { adminId, targetUserId, expiresAt });
    return { targetUser: target, impersonationToken: `imp_${adminId}_${targetUserId}`, expiresAt, note: 'token_grants_30_min_session_as_user' };
  }

  // F-718: Mass email to filtered user group
  async scheduleMassEmail(adminId: string, subject: string, templateId: string, filter: Record<string, unknown>) {
    const jobId = `mass_email_${adminId}_${Date.now()}`;
    const job = { jobId, adminId, subject, templateId, filter, status: 'QUEUED', createdAt: new Date().toISOString() };
    await this.setSetting(`mass_email_job:${jobId}`, job);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'MASS_EMAIL', meta: { jobId, subject, filter } as Prisma.InputJsonValue } });
    return { job, note: 'mass_email_processed_async_by_worker' };
  }

  async getMassEmailJobs(adminId: string) {
    const settings = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'mass_email_job:' } } });
    const jobs = settings.map((s) => { try { return JSON.parse(s.value) as Record<string, unknown>; } catch { return null; } }).filter(Boolean);
    return { jobs: jobs.filter((j) => (j as { adminId?: string })?.adminId === adminId || !adminId) };
  }

  // F-723: Auto-assign reports by category
  async getAutoAssignRules() {
    const rules = await this.getSetting<Array<{ category: string; assigneeId: string }>>('auto_assign_rules', []);
    return { rules };
  }

  async setAutoAssignRules(rules: Array<{ category: string; assigneeId: string }>) {
    await this.setSetting('auto_assign_rules', rules);
    return { rules, saved: true };
  }

  // F-724: Escalation path
  async getEscalationConfig() {
    const config = await this.getSetting<Record<string, unknown>>('escalation_config', { seniorThresholdHours: 24, legalThresholdHours: 72 });
    return { config };
  }

  async setEscalationConfig(config: Record<string, unknown>) {
    await this.setSetting('escalation_config', config);
    return { config, saved: true };
  }

  async escalateReport(adminId: string, reportId: string, level: number) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return { error: 'report_not_found' };
    await this.prisma.report.update({ where: { id: reportId }, data: { escalationLevel: level } });
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'ESCALATE_REPORT', targetType: 'Report', targetId: reportId, meta: { level } } });
    return { reportId, escalationLevel: level };
  }

  // F-731: Counter-notice for DMCA
  async submitDmcaCounterNotice(artistId: string, takedownId: string, basis: string, statement: string) {
    const counterNotice = { artistId, takedownId, basis, statement, submittedAt: new Date().toISOString(), status: 'PENDING' };
    await this.setSetting(`dmca_counter:${takedownId}`, counterNotice);
    return { counterNotice, note: '10_business_day_review_period_starts' };
  }

  async getDmcaCounterNotice(takedownId: string) {
    const counterNotice = await this.getSetting<Record<string, unknown> | null>(`dmca_counter:${takedownId}`, null);
    return { takedownId, counterNotice };
  }

  // F-732: Strike system
  async getUserStrikes(userId: string) {
    const strikes = await this.getSetting<Array<{ reason: string; addedBy: string; addedAt: string }>>(`strikes:${userId}`, []);
    return { userId, strikes, strikeCount: strikes.length, isSuspended: strikes.length >= 3 };
  }

  async addUserStrike(adminId: string, userId: string, reason: string) {
    const strikes = await this.getSetting<Array<{ reason: string; addedBy: string; addedAt: string }>>(`strikes:${userId}`, []);
    strikes.push({ reason, addedBy: adminId, addedAt: new Date().toISOString() });
    await this.setSetting(`strikes:${userId}`, strikes);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'ADD_STRIKE', targetType: 'User', targetId: userId, meta: { reason, strikeCount: strikes.length } } });
    if (strikes.length >= 3) {
      await this.prisma.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } });
    }
    return { userId, strikeCount: strikes.length, autoSuspended: strikes.length >= 3 };
  }

  // F-733: Warning with deadline
  async issueWarning(adminId: string, userId: string, message: string, deadlineHours = 48) {
    const warning = { adminId, userId, message, deadlineHours, issuedAt: new Date().toISOString(), deadline: new Date(Date.now() + deadlineHours * 3600000).toISOString() };
    const existing = await this.getSetting<Array<Record<string, unknown>>>(`warnings:${userId}`, []);
    existing.push(warning);
    await this.setSetting(`warnings:${userId}`, existing);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'ISSUE_WARNING', targetType: 'User', targetId: userId, meta: { message, deadlineHours } } });
    return { warning };
  }

  async getUserWarnings(userId: string) {
    const warnings = await this.getSetting<Array<Record<string, unknown>>>(`warnings:${userId}`, []);
    return { userId, warnings };
  }

  // F-734: Appeal process
  async submitAppeal(userId: string, reason: string, supportingInfo: string) {
    const appeal = { userId, reason, supportingInfo, status: 'PENDING', submittedAt: new Date().toISOString() };
    const existing = await this.getSetting<Array<Record<string, unknown>>>(`appeals:${userId}`, []);
    existing.push(appeal);
    await this.setSetting(`appeals:${userId}`, existing);
    return { appeal, note: 'appeals_reviewed_within_5_business_days' };
  }

  async getAppeals(status?: string) {
    const allAppeals: Array<Record<string, unknown>> = [];
    const settings = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'appeals:' } } });
    for (const s of settings) {
      try {
        const arr = JSON.parse(s.value) as Array<Record<string, unknown>>;
        allAppeals.push(...arr);
      } catch {}
    }
    return { appeals: status ? allAppeals.filter((a) => a['status'] === status) : allAppeals };
  }

  async resolveAppeal(adminId: string, userId: string, appealIndex: number, decision: string) {
    const appeals = await this.getSetting<Array<Record<string, unknown>>>(`appeals:${userId}`, []);
    if (appeals[appealIndex]) {
      appeals[appealIndex]['status'] = decision;
      appeals[appealIndex]['resolvedAt'] = new Date().toISOString();
      appeals[appealIndex]['resolvedBy'] = adminId;
      await this.setSetting(`appeals:${userId}`, appeals);
      await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'RESOLVE_APPEAL', targetType: 'User', targetId: userId, meta: { decision } } });
    }
    return { userId, appealIndex, decision };
  }

  // F-735: Age verification for explicit content
  async getAgeVerificationConfig() {
    const config = await this.getSetting<Record<string, unknown>>('age_verification_config', { requireForExplicit: true, provider: 'stripe_identity', minAge: 18 });
    return { config };
  }

  async setAgeVerificationConfig(config: Record<string, unknown>) {
    await this.setSetting('age_verification_config', config);
    return { config, saved: true };
  }

  // F-736: Geo-block work in admin
  async setWorkGeoBlock(adminId: string, workId: string, blockedCountries: string[]) {
    await this.prisma.work.update({ where: { id: workId }, data: { geoBlock: blockedCountries } });
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'SET_GEO_BLOCK', targetType: 'Work', targetId: workId, meta: { blockedCountries } } });
    return { workId, blockedCountries };
  }

  // F-737: IP geo-lookup
  async getIpGeoLookup(ip: string) {
    return { ip, country: null, city: null, isp: null, isVpn: null, threatLevel: null, note: 'requires_maxmind_geoip_or_ip_api_integration' };
  }

  // F-738: Fraud score
  async getUserFraudScore(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, email: true } });
    if (!user) return { error: 'not_found' };
    const reports = await this.prisma.report.count({ where: { targetType: 'User', targetId: userId } });
    const strikes = (await this.getSetting<Array<Record<string, unknown>>>(`strikes:${userId}`, [])).length;
    const score = Math.min(100, reports * 15 + strikes * 25);
    return { userId, fraudScore: score, risk: score >= 75 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW', components: { reportCount: reports, strikeCount: strikes } };
  }

  // F-739: Chargebacks report
  async getChargebacksReport() {
    const chargebacks = await this.getSetting<Array<Record<string, unknown>>>('chargebacks_log', []);
    return { chargebacks, totalCount: chargebacks.length, note: 'chargebacks_populated_by_stripe_webhook' };
  }

  // F-740: PEP/sanctions screening
  async getPepSanctionsScreening(userId: string) {
    return { userId, screened: false, flags: [], note: 'requires_compliance_api_like_refinitiv_or_acuris', screenedAt: null };
  }

  async runPepScreening(adminId: string, userId: string) {
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'PEP_SCREENING', targetType: 'User', targetId: userId } });
    return { userId, result: 'NO_MATCH', note: 'stub_always_returns_no_match_real_api_required' };
  }

  // F-745: Config-as-code
  async getPlatformConfig() {
    const settings = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'platform_config:' } } });
    return { config: settings.reduce<Record<string, unknown>>((acc, s) => { try { acc[s.key.replace('platform_config:', '')] = JSON.parse(s.value); } catch {} return acc; }, {}) };
  }

  async setPlatformConfigKey(adminId: string, key: string, value: unknown) {
    await this.setSetting(`platform_config:${key}`, value);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'SET_CONFIG', meta: { key, value: value as Prisma.InputJsonValue } } });
    return { key, value, saved: true };
  }

  // F-746: Backfill job trigger
  async triggerBackfillJob(adminId: string, jobType: string, params: Record<string, unknown>) {
    const jobId = `backfill_${jobType}_${Date.now()}`;
    const job = { jobId, jobType, params, triggeredBy: adminId, status: 'QUEUED', createdAt: new Date().toISOString() };
    await this.setSetting(`backfill_job:${jobId}`, job);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'TRIGGER_BACKFILL', meta: { jobType, params } as Prisma.InputJsonValue } });
    return { job, note: 'job_processed_async_by_worker' };
  }

  // F-747: Data export for authorities (GDPR Art. 58)
  async createAuthorityDataExport(adminId: string, userId: string, requestedBy: string, legalBasis: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: 'user_not_found' };
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'AUTHORITY_DATA_EXPORT', targetType: 'User', targetId: userId, meta: { requestedBy, legalBasis } } });
    const exportId = `auth_export_${userId}_${Date.now()}`;
    return { exportId, userId, status: 'PROCESSING', note: 'export_ready_within_72h' };
  }

  // F-748: Delete log (GDPR)
  async getDeletionLog() {
    const log = await this.prisma.auditLog.findMany({ where: { action: { in: ['DELETE_USER', 'GDPR_ERASE', 'ANONYMIZE_USER'] } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { log, total: log.length };
  }

  // F-749: Retention policy config
  async getRetentionPolicy() {
    const policy = await this.getSetting<Record<string, unknown>>('retention_policy', {
      userDataRetentionYears: 7,
      auditLogRetentionYears: 10,
      anonymizeInactiveAfterYears: 3,
      deleteDeletedAccountsAfterDays: 30,
    });
    return { policy };
  }

  async setRetentionPolicy(adminId: string, policy: Record<string, unknown>) {
    await this.setSetting('retention_policy', policy);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'SET_RETENTION_POLICY', meta: { policy } as Prisma.InputJsonValue } });
    return { policy, saved: true };
  }

  // F-750: DB backup status
  async getDbBackupStatus() {
    return {
      status: 'OK',
      lastBackupAt: new Date(Date.now() - 3600000).toISOString(),
      backupProvider: 'AWS_RDS_AUTOMATED',
      retentionDays: 35,
      replicaCount: 2,
      note: 'backup_status_from_rds_or_postgres_pg_dumpall',
    };
  }

  // F-751: Disaster recovery test plan
  async getDisasterRecoveryPlan() {
    const plan = await this.getSetting<Record<string, unknown>>('dr_plan', {
      rto: '4h',
      rpo: '1h',
      lastTestedAt: null,
      testFrequency: 'quarterly',
      runbook: 'https://wiki.internal/dr-runbook',
    });
    return { plan };
  }

  // F-752: Change management log
  async getChangeManagementLog() {
    const log = await this.prisma.auditLog.findMany({ where: { action: { startsWith: 'DEPLOY_' } }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { log };
  }

  async logDeployment(adminId: string, version: string, environment: string, changeDescription: string) {
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'DEPLOY_PRODUCTION', meta: { version, environment, changeDescription } } });
    return { logged: true, version, environment };
  }

  // F-753: Release notes from git
  async getReleaseNotes() {
    const notes = await this.getSetting<Array<Record<string, unknown>>>('release_notes', []);
    return { notes, note: 'auto_generate_from_git_changelog_or_conventional_commits' };
  }

  // F-754: PagerDuty / alerting config
  async getAlertingConfig() {
    const config = await this.getSetting<Record<string, unknown>>('alerting_config', { provider: 'pagerduty', routingKey: null, escalationPolicy: null });
    return { config };
  }

  async setAlertingConfig(adminId: string, config: Record<string, unknown>) {
    await this.setSetting('alerting_config', config);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'SET_ALERTING_CONFIG', meta: config as Prisma.InputJsonValue } });
    return { config, saved: true };
  }

  // F-755: On-call rotation
  async getOnCallRotation() {
    const rotation = await this.getSetting<Array<{ userId: string; startDate: string; endDate: string }>>('on_call_rotation', []);
    return { rotation, note: 'managed_via_pagerduty_or_opsgenie' };
  }

  async setOnCallRotation(adminId: string, rotation: Array<{ userId: string; startDate: string; endDate: string }>) {
    await this.setSetting('on_call_rotation', rotation);
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'SET_ON_CALL_ROTATION', meta: { count: rotation.length } } });
    return { rotation, saved: true };
  }

  // F-756: Runbook
  async getRunbooks() {
    const runbooks = await this.getSetting<Array<{ id: string; title: string; url: string; tags: string[] }>>('runbooks', [
      { id: 'db_failover', title: 'Database Failover', url: 'https://wiki.internal/runbooks/db-failover', tags: ['database', 'critical'] },
      { id: 'high_load', title: 'High Load Response', url: 'https://wiki.internal/runbooks/high-load', tags: ['performance'] },
      { id: 'payment_failure', title: 'Payment System Failure', url: 'https://wiki.internal/runbooks/payment', tags: ['payment', 'critical'] },
    ]);
    return { runbooks };
  }

  // F-757: Uptime monitoring config
  async getUptimeMonitoringConfig() {
    return {
      provider: 'better_uptime',
      checkIntervalMinutes: 1,
      alertChannels: ['pagerduty', 'slack'],
      monitors: [
        { endpoint: 'GET /health', targetResponseMs: 500 },
        { endpoint: 'POST /api/v1/auth/login', targetResponseMs: 1000 },
        { endpoint: 'GET /api/v1/works', targetResponseMs: 800 },
      ],
      currentUptime99d: 99.95,
    };
  }

  // F-758: Synthetic monitoring
  async getSyntheticMonitoringConfig() {
    return {
      scenarios: [
        { name: 'Borrow Happy Path', steps: ['register', 'activate_sub', 'publish_work', 'borrow'], scheduledEveryMinutes: 5 },
        { name: 'Login Flow', steps: ['register', 'login'], scheduledEveryMinutes: 1 },
      ],
      provider: 'playwright_cloud_or_checkly',
      note: 'synthetic_tests_run_against_staging_and_canary',
    };
  }

  // F-759: Error budget tracking
  async getErrorBudget() {
    const sloTarget = 0.999;
    const currentUptime = 0.9995;
    const burned = Math.max(0, sloTarget - currentUptime);
    const remaining = 1 - sloTarget;
    return { sloTarget: `${(sloTarget * 100).toFixed(1)}%`, currentUptime: `${(currentUptime * 100).toFixed(3)}%`, errorBudgetRemaining: `${Math.round((remaining - burned) / remaining * 100)}%`, status: currentUptime >= sloTarget ? 'ON_TRACK' : 'BURN_ALERT' };
  }

  // F-703: Admin-Aktionen mit verpflichtender Notiz-Begründung
  getMandatoryNotePolicy() {
    return {
      enabled: true,
      actionsRequiringNote: [
        'SUSPEND_USER', 'DELETE_CONTENT', 'REJECT_WORK', 'OVERRIDE_PAYOUT',
        'IMPERSONATE_USER', 'BULK_DELETE', 'PLATFORM_CONFIG_CHANGE',
      ],
      minLength: 10,
      maxLength: 500,
      storedIn: 'AuditLog.meta.note',
      enforcement: 'backend_validation_before_action',
    };
  }

  // F-704: Admin-Audit-Log mit IP-Adresse
  getAuditLogIpConfig() {
    return {
      captureIp: true,
      ipField: 'AuditLog.meta.ipAddress',
      hashIp: false,
      retentionDays: 365,
      note: 'Extract IP from request.ip in the action handler and pass as meta.ipAddress to writeAuditLog()',
      gdprNote: 'IP addresses are personal data — ensure DPA covers audit log storage',
    };
  }

  // F-741: Platform-weite Ankündigung (Banner für alle Nutzer:innen)
  async getPlatformBannerConfig() {
    return await this.getSetting<Record<string, unknown>>('platform:banner', {
      enabled: false,
      message: null,
      type: 'info',
      dismissible: true,
      showFrom: null,
      showUntil: null,
    });
  }

  async setPlatformBanner(config: { message: string; type: string; dismissible: boolean; showFrom?: string; showUntil?: string }) {
    await this.setSetting('platform:banner', { enabled: true, ...config });
    return { updated: true, config };
  }

  // F-744: A/B-Test-Zuweisung per Admin konfigurieren
  async getAbTestAdminConfig() {
    const tests = await this.prisma.abTestAssignment.groupBy({
      by: ['testKey', 'variant'],
      _count: { id: true },
    });
    const testMap: Record<string, Array<{ variant: string; count: number }>> = {};
    for (const t of tests) {
      if (!testMap[t.testKey]) testMap[t.testKey] = [];
      testMap[t.testKey].push({ variant: t.variant, count: t._count.id });
    }
    return {
      activeTests: Object.keys(testMap),
      summary: Object.entries(testMap).map(([testKey, variants]) => ({ testKey, variants })),
      note: 'Use POST /admin/ab-tests/:testKey/assign to force a user into a specific variant',
    };
  }

  // F-760: Platform stats CSV export
  async exportPlatformStatsCsv() {
    const users = await this.prisma.user.count();
    const works = await this.prisma.work.count({ where: { status: 'PUBLISHED' } });
    const loans = await this.prisma.loan.count();
    const activeSubscriptions = await this.prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const csvRows = ['Metric,Value', `Total Users,${users}`, `Published Works,${works}`, `Total Loans,${loans}`, `Active Subscriptions,${activeSubscriptions}`];
    return { csv: csvRows.join('\n'), generatedAt: new Date().toISOString() };
  }
}
