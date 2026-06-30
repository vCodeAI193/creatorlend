import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub implementations for payment/monetisation artist-facing features
 * F-322 to F-406 (selected gaps not covered by PayoutsService / InvoiceService).
 */
@Injectable()
export class PaymentsStubsService {
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

  // F-322: Kauf-Option – Werk dauerhaft erwerben
  async purchasePermanent(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { id: true, title: true, loanPriceCents: true } });
    if (!work) throw new Error('work_not_found');
    return { userId, workId, workTitle: work.title, permanentPriceCents: (work.loanPriceCents ?? 0) * 10, message: 'Permanent purchase stub – implement Stripe one-time charge + PermanentPurchase record' };
  }

  async getPermanentPurchases(userId: string) {
    const key = `permanent_purchases:${userId}`;
    const purchases = await this.getSetting<string[]>(key, []);
    return { userId, purchasedWorkIds: purchases, count: purchases.length };
  }

  // F-324: Spende-Button auf Künstlerprofil
  async getDonationConfig(artistId: string) {
    const config = await this.getSetting<Record<string, unknown>>(`donation_config:${artistId}`, { enabled: false });
    return { artistId, ...config, message: 'Donation stub – configure Stripe payment link or Ko-fi embed' };
  }

  async setDonationConfig(artistId: string, enabled: boolean, minAmountCents: number) {
    await this.setSetting(`donation_config:${artistId}`, { enabled, minAmountCents });
    return { artistId, enabled, minAmountCents };
  }

  // F-325: Ko-fi / Patreon-Link auf Profil einbinden
  async getExternalFundingLinks(artistId: string) {
    const data = await this.getSetting<Record<string, unknown>>(`funding_links:${artistId}`, {});
    return { artistId, ...data };
  }

  async setExternalFundingLinks(artistId: string, links: { kofi?: string; patreon?: string; buymeacoffee?: string }) {
    await this.setSetting(`funding_links:${artistId}`, links);
    return { artistId, links };
  }

  // F-326: Bundle-Angebote (3 Werke zum Preis von 2)
  async createBundle(artistId: string, name: string, workIds: string[], discountPercent: number) {
    const key = `bundle:${artistId}:${Date.now()}`;
    const data = { artistId, name, workIds, discountPercent, active: true, createdAt: new Date().toISOString() };
    await this.setSetting(key, data);
    return { bundleKey: key, ...data };
  }

  async getBundles(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `bundle:${artistId}:` } } });
    return rows.map((r) => { try { return { key: r.key, ...JSON.parse(r.value) }; } catch { return null; } }).filter(Boolean);
  }

  // F-327: Saisonaler Sale
  async createSale(artistId: string, workIds: string[], discountPercent: number, startsAt: string, endsAt: string) {
    const key = `sale:${artistId}:${Date.now()}`;
    await this.setSetting(key, { artistId, workIds, discountPercent, startsAt, endsAt, active: true });
    return { saleKey: key, artistId, workIds, discountPercent, startsAt, endsAt };
  }

  async getActiveSales(artistId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `sale:${artistId}:` } } });
    const now = new Date().toISOString();
    return rows.map((r) => { try { const d = JSON.parse(r.value); return d.startsAt <= now && d.endsAt >= now ? { key: r.key, ...d } : null; } catch { return null; } }).filter(Boolean);
  }

  // F-328: Dynamisches Pricing je nach Nachfrage
  getDynamicPricingConfig() {
    return { enabled: false, status: 'planned', strategy: 'surge_pricing', triggers: ['high_loan_velocity', 'low_inventory'], message: 'Dynamic pricing requires loan velocity analytics + price update worker' };
  }

  // F-329: Preisuntergrenzen und -obergrenzen (Admin-Policy)
  getPriceBounds() {
    return { minLoanPriceCents: 49, maxLoanPriceCents: 500, currency: 'EUR', message: 'Enforce in WorksService.create/update: reject if loanPriceCents outside bounds' };
  }

  // F-362: Auszahlung via PayPal
  getPayPalPayoutConfig() {
    return { supported: false, status: 'planned', provider: 'PayPal Payouts API', setupUrl: 'https://developer.paypal.com/docs/payouts/', requirements: ['PayPal Business account', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'], message: 'PayPal payout requires server-side Payouts API integration' };
  }

  // F-363: Auszahlung via Wise (TransferWise)
  getWisePayoutConfig() {
    return { supported: false, status: 'planned', provider: 'Wise Business API', setupUrl: 'https://docs.wise.com/api-docs/features/payouts', requirements: ['Wise Business account', 'WISE_API_KEY', 'WISE_PROFILE_ID'], message: 'Wise payout is a planned integration; currently only Stripe Connect is active' };
  }

  // F-369: Umsatzsteuer-Vorausmeldung-Export (AT/DE)
  async getVatPreReturnExport(userId: string, year: number, period: 'monthly' | 'quarterly') {
    return { userId, year, period, format: 'CSV', message: 'VAT pre-return export stub – aggregate PayoutItems with VAT rate by period and generate ELSTER/Finanzonline-compatible CSV', data: [] };
  }

  // F-370: 1099-K Formular für US-Künstler:innen
  async get1099K(userId: string, year: number) {
    const rows = await this.prisma.payoutItem.findMany({ where: { artistId: userId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) }, status: 'PAID' } });
    const totalCents = rows.reduce((s, r) => s + r.amountCents, 0);
    return { userId, year, totalUSD: (totalCents / 100).toFixed(2), threshold1099K: 600, requiresForm: totalCents / 100 >= 600, message: '1099-K form generation stub – integrate with Stripe or tax document provider' };
  }

  // F-371: Stripe Tax Integration
  getStripeTaxConfig() {
    return { enabled: false, status: 'planned', product: 'Stripe Tax', documentation: 'https://stripe.com/docs/tax', requirements: ['Enable Tax in Stripe Dashboard', 'Set product.tax_code on all Stripe products'], message: 'Add stripe.tax.calculate() call in checkout flow; Stripe handles MwSt automatically' };
  }

  // F-373: Bonus-Revenue-Share für Premium-Künstler:innen
  async getBonusRevenueShare(artistId: string) {
    const tier = await this.getSetting<string>(`artist_tier:${artistId}`, 'STANDARD');
    const shareMap: Record<string, number> = { STANDARD: 70, PREMIUM: 80, PARTNER: 85 };
    return { artistId, tier, revenueSharePercent: shareMap[tier] ?? 70, message: 'Tier is set by admin via AppSetting artist_tier:<artistId>' };
  }

  // F-374: Streaming-Royalties (Vergütung je Stream-Minute)
  async getStreamingRoyaltyConfig() {
    const ratePerMinuteCents = await this.getSetting<number>('streaming_royalty_rate_per_min_cents', 0);
    return { enabled: ratePerMinuteCents > 0, ratePerMinuteCents, message: 'Set streaming_royalty_rate_per_min_cents AppSetting to enable per-minute royalties; requires playback tracking in saveProgress()' };
  }

  // F-375: Metered Billing
  getMeteredBillingConfig() {
    return { enabled: false, status: 'planned', model: 'Stripe Metered Subscriptions', metric: 'listened_minutes', reportUsageEndpoint: 'POST /api/v1/billing/usage', message: 'Metered billing requires Stripe subscription with usage_type=metered and periodic usage reporting' };
  }

  // F-376: Künstler:in kann Preisempfehlung setzen
  async setPriceRecommendation(artistId: string, workId: string, recommendedCents: number) {
    await this.setSetting(`price_rec:${workId}`, { artistId, recommendedCents });
    return { workId, recommendedCents, message: 'Recommendation stored; platform can use this as a basis for suggested lending price' };
  }

  async getPriceRecommendation(workId: string) {
    return this.getSetting<Record<string, unknown>>(`price_rec:${workId}`, { recommendedCents: null });
  }

  // F-378: Kostenfreie Leihe für Rezensenten (Review-Copies)
  async createReviewCopy(artistId: string, workId: string, recipientEmail: string) {
    const code = `REVIEW-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    await this.setSetting(`review_copy:${code}`, { artistId, workId, recipientEmail, usedAt: null, createdAt: new Date().toISOString() });
    return { code, workId, recipientEmail, message: 'Send code to reviewer; they redeem via POST /api/v1/loans with reviewCode in body' };
  }

  // F-379: Pressekopien
  async createPressCopy(artistId: string, workId: string, journalistEmail: string) {
    const code = `PRESS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    await this.setSetting(`press_copy:${code}`, { artistId, workId, journalistEmail, usedAt: null, createdAt: new Date().toISOString() });
    return { code, workId, journalistEmail };
  }

  // F-380: Sponsoring-Feature
  async createSponsorship(sponsorId: string, workId: string, amountCents: number, message?: string) {
    const key = `sponsorship:${workId}:${sponsorId}`;
    await this.setSetting(key, { sponsorId, workId, amountCents, message, createdAt: new Date().toISOString(), status: 'PENDING' });
    return { key, sponsorId, workId, amountCents, status: 'PENDING', message: 'Sponsoring stub – fund free loans for a work via sponsor payment' };
  }

  async getSponsorships(workId: string) {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `sponsorship:${workId}:` } } });
    return rows.map((r) => { try { return JSON.parse(r.value); } catch { return null; } }).filter(Boolean);
  }

  // F-381: Bibliotheks-Lizenz
  async createLibraryLicense(libraryId: string, monthlyFlatrateCents: number) {
    await this.setSetting(`library_license:${libraryId}`, { libraryId, monthlyFlatrateCents, active: true, createdAt: new Date().toISOString() });
    return { libraryId, monthlyFlatrateCents, active: true, message: 'Library license stub – gives unlimited borrowing for the library; requires dedicated User role LIBRARY' };
  }

  // F-382: Schullizenz
  async createSchoolLicense(schoolId: string, studentCount: number, pricePerStudentCents: number) {
    const total = studentCount * pricePerStudentCents;
    await this.setSetting(`school_license:${schoolId}`, { schoolId, studentCount, pricePerStudentCents, totalCents: total, active: true });
    return { schoolId, studentCount, pricePerStudentCents, totalCents: total, active: true };
  }

  // F-384: Affiliate-Provision
  async createAffiliateLink(userId: string) {
    const code = `AFF-${userId.slice(0, 8).toUpperCase()}`;
    await this.setSetting(`affiliate:${userId}`, { userId, code, commissionPercent: 10, totalEarnedCents: 0 });
    return { userId, code, commissionPercent: 10, referralUrl: `${process.env.WEB_BASE_URL ?? 'https://creatorlend.app'}?ref=${code}` };
  }

  async getAffiliateStats(userId: string) {
    return this.getSetting<Record<string, unknown>>(`affiliate:${userId}`, { totalEarnedCents: 0, referrals: 0 });
  }

  // F-385: Publisher-Deal
  async createPublisherDeal(publisherId: string, artistIds: string[], revenueSharePercent: number) {
    const key = `publisher_deal:${publisherId}`;
    await this.setSetting(key, { publisherId, artistIds, revenueSharePercent, active: true, createdAt: new Date().toISOString() });
    return { publisherId, artistIds, revenueSharePercent, active: true };
  }

  // F-386: Multi-Artist-Einnahmenteilung für Kollaborationen
  async createCollaborationSplit(workId: string, splits: Array<{ artistId: string; percent: number }>) {
    const total = splits.reduce((s, x) => s + x.percent, 0);
    if (total !== 100) throw new Error('splits_must_total_100_percent');
    await this.setSetting(`collab_split:${workId}`, splits);
    return { workId, splits };
  }

  async getCollaborationSplit(workId: string) {
    return this.getSetting<Array<{ artistId: string; percent: number }>>(`collab_split:${workId}`, []);
  }

  // F-387: Split-Payments
  async getSplitPaymentConfig(artistId: string) {
    return this.getSetting<Record<string, unknown>>(`split_payment:${artistId}`, { enabled: false, recipients: [] });
  }

  async setSplitPaymentConfig(artistId: string, recipients: Array<{ accountId: string; percent: number }>) {
    await this.setSetting(`split_payment:${artistId}`, { enabled: true, recipients });
    return { artistId, recipients };
  }

  // F-388: Escrow für Zahlungsstreitigkeiten
  async createEscrow(payoutId: string, reason: string) {
    await this.setSetting(`escrow:${payoutId}`, { payoutId, reason, status: 'HELD', createdAt: new Date().toISOString() });
    return { payoutId, status: 'HELD', reason, message: 'Escrow stub – manually resolved by admin; set status to RELEASED or REFUNDED' };
  }

  // F-389: Rückerstattungs-Dashboard für Künstler:innen
  async getRefundDashboard(artistId: string) {
    const items = await this.prisma.payoutItem.findMany({ where: { artistId, status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 20 });
    const totalRefundedCents = items.reduce((s, i) => s + i.amountCents, 0);
    return { artistId, refunds: items.length, totalRefundedCents, items };
  }

  // F-390: Chargeback-Management
  async getChargebacks(artistId: string) {
    return { artistId, chargebacks: [], message: 'Chargeback management stub – connect to Stripe webhook dispute.created to populate chargeback records', integration: 'Stripe webhook event: charge.dispute.created → POST /api/v1/webhooks/stripe' };
  }

  // F-393: ID-Verifizierung via IDnow / Onfido
  getIdVerificationConfig() {
    return {
      providers: [
        { name: 'IDnow', supported: false, docs: 'https://www.idnow.io/api/', message: 'Register at IDnow portal, add IDNOW_API_KEY to env' },
        { name: 'Onfido', supported: false, docs: 'https://documentation.onfido.com/', message: 'Add ONFIDO_API_TOKEN to env, integrate SDK' },
      ],
      message: 'ID verification triggered automatically at KYC threshold (F-392); replace stub with real SDK call',
    };
  }

  // F-394: Stripe Identity
  getStripeIdentityConfig() {
    return { enabled: false, status: 'planned', product: 'Stripe Identity', documentation: 'https://stripe.com/docs/identity', requirements: ['Stripe account with Identity enabled', 'VerificationSession API call'], message: 'Create StripeIdentitySession and return client_secret to frontend for embedded flow' };
  }

  // F-395: AML-Screening
  getAmlConfig() {
    return { enabled: false, status: 'planned', provider: 'Comply Advantage / Seon', thresholdEuros: 10000, message: 'AML screening triggered when payout exceeds threshold; integrate Comply Advantage or Seon API' };
  }

  // F-396: Einnahmen-Vorhersage (KI)
  async getEarningsForecast(artistId: string) {
    const last3 = await this.prisma.payoutItem.findMany({ where: { artistId, status: 'PAID' }, orderBy: { createdAt: 'desc' }, take: 100 });
    const avg = last3.length ? last3.reduce((s, i) => s + i.amountCents, 0) / last3.length : 0;
    return { artistId, forecastNextMonthCents: Math.round(avg * 30), basedOnItems: last3.length, message: 'Simple average-based forecast stub; replace with ML model for production' };
  }

  // F-397: Break-Even-Rechner
  async calculateBreakEven(artistId: string, productionCostCents: number) {
    const settings = await this.getSetting<{ revenueSharePercent?: number }>(`artist_tier:settings:${artistId}`, {});
    const sharePercent = settings.revenueSharePercent ?? 70;
    const last30 = await this.prisma.payoutItem.findMany({ where: { artistId, status: 'PAID', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });
    const avgMonthlyEarnings = last30.reduce((s, i) => s + i.amountCents, 0);
    const monthsToBreakEven = avgMonthlyEarnings > 0 ? productionCostCents / avgMonthlyEarnings : null;
    return { artistId, productionCostCents, sharePercent, avgMonthlyEarningsCents: avgMonthlyEarnings, monthsToBreakEven: monthsToBreakEven ? Math.ceil(monthsToBreakEven) : null };
  }

  // F-398: Einnahmen-Ziel setzen
  async setEarningsGoal(artistId: string, targetCents: number, deadline: string) {
    await this.setSetting(`earnings_goal:${artistId}`, { targetCents, deadline, setAt: new Date().toISOString() });
    return { artistId, targetCents, deadline };
  }

  async getEarningsGoalProgress(artistId: string) {
    const goal = await this.getSetting<{ targetCents: number; deadline: string; setAt: string } | null>(`earnings_goal:${artistId}`, null);
    if (!goal) return { hasGoal: false };
    const earned = await this.prisma.payoutItem.aggregate({ where: { artistId, status: 'PAID', createdAt: { gte: new Date(goal.setAt) } }, _sum: { amountCents: true } });
    const earnedCents = earned._sum.amountCents ?? 0;
    return { hasGoal: true, targetCents: goal.targetCents, earnedCents, progressPercent: Math.min(100, Math.round((earnedCents / goal.targetCents) * 100)), deadline: goal.deadline };
  }

  // F-399: Vergleich mit ähnlichen Künstler:innen (Benchmark, anonym)
  async getAnonymousBenchmark(artistId: string) {
    const artist = await this.prisma.user.findUnique({ where: { id: artistId }, select: { id: true } });
    if (!artist) throw new Error('artist_not_found');
    const allArtistEarnings = await this.prisma.payoutItem.groupBy({ by: ['artistId'], where: { status: 'PAID' }, _sum: { amountCents: true } });
    const totals = allArtistEarnings.map((r) => r._sum.amountCents ?? 0).sort((a, b) => a - b);
    const myTotal = allArtistEarnings.find((r) => r.artistId === artistId)?._sum?.amountCents ?? 0;
    const rank = totals.filter((t) => t < myTotal).length + 1;
    return { percentile: Math.round((rank / totals.length) * 100), totalArtists: totals.length, message: 'Anonymous benchmark – your rank among all artists by total earnings' };
  }

  // F-400: Einnahmen-Widget für Dashboard
  async getEarningsWidget(artistId: string) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonth = await this.prisma.payoutItem.aggregate({ where: { artistId, createdAt: { gte: monthStart } }, _sum: { amountCents: true } });
    const allTime = await this.prisma.payoutItem.aggregate({ where: { artistId, status: 'PAID' }, _sum: { amountCents: true } });
    return { thisMonthCents: thisMonth._sum.amountCents ?? 0, allTimeCents: allTime._sum.amountCents ?? 0, currency: 'EUR' };
  }

  // F-403: Einnahmen-Split für Labelverträge
  async getLabelSplitConfig(artistId: string) {
    return this.getSetting<Record<string, unknown>>(`label_split:${artistId}`, { labelId: null, labelPercent: 0 });
  }

  async setLabelSplitConfig(artistId: string, labelId: string, labelPercent: number) {
    await this.setSetting(`label_split:${artistId}`, { labelId, labelPercent, artistPercent: 100 - labelPercent });
    return { artistId, labelId, labelPercent, artistPercent: 100 - labelPercent };
  }

  // F-404: Lizenzgebühren-Abwicklung für Fremd-Content
  async getLicenseFees(workId: string) {
    return this.getSetting<Record<string, unknown>[]>(`license_fees:${workId}`, []);
  }

  async addLicenseFee(workId: string, licensorName: string, ratePercent: number) {
    const key = `license_fees:${workId}`;
    const existing = await this.getSetting<Record<string, unknown>[]>(key, []);
    existing.push({ licensorName, ratePercent, addedAt: new Date().toISOString() });
    await this.setSetting(key, existing);
    return { workId, fees: existing };
  }

  // F-405: Crowdfunding-Rückerstattung
  async getCrowdfundingRefundStatus(campaignId: string) {
    const data = await this.getSetting<Record<string, unknown>>(`crowdfunding:${campaignId}`, { status: 'UNKNOWN' });
    return { campaignId, ...data, message: 'Crowdfunding stub – if goal not reached, trigger refunds via Stripe payment intents reversal' };
  }

  // F-406: Spendenquittung
  async getDonationReceipt(userId: string, year: number) {
    const donations = await this.getSetting<Array<Record<string, unknown>>>(`donations:${userId}:${year}`, []);
    const total = donations.reduce((s, d) => s + ((d.amountCents as number) ?? 0), 0);
    return { userId, year, totalCents: total, donations, message: 'Donation receipt stub – generate PDF with tax authority requirements for charitable donations' };
  }
}
