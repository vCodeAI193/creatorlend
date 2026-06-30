import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub implementations for billing/payment listener-facing features
 * F-330 to F-420 (selected gaps not covered by SubscriptionsService).
 */
@Injectable()
export class BillingStubsService {
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

  // F-330: Freemium – bestimmte Werke kostenlos leihen (ad-supported)
  async getFreemiumWorks(limit = 20) {
    const works = await this.prisma.work.findMany({ where: { status: 'PUBLISHED', loanPriceCents: 0 }, take: limit, select: { id: true, title: true, type: true, coverKey: true } });
    return { count: works.length, works, message: 'Works with loanPriceCents=0 are freemium; set adSupported flag via AppSetting freemium:<workId>=true to enable ad injection' };
  }

  // F-331: Werbung im Free-Tier (Audio-Ads)
  getAudioAdConfig() {
    return { enabled: false, provider: 'Google Ad Manager / AdsWizz', adFrequency: 'before_playback', message: 'Audio ad injection is a client-side feature; server provides ad-enabled flag; ad tags from AdSWizz or GAM' };
  }

  // F-332: Ad-Server-Integration
  getAdServerConfig() {
    return { provider: null, status: 'planned', options: ['Google Ad Manager (GAM)', 'AdsWizz', 'Triton Digital', 'Spotify Ad Studio'], message: 'Configure VAST tags on client; server signals isAdSupported on work endpoint' };
  }

  // F-333: Werbe-freie Erfahrung für bezahlende Nutzer:innen
  async isAdFree(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' } });
    return { userId, adFree: !!sub, subscriptionStatus: sub?.status ?? null };
  }

  // F-337: Klarna / Buy-Now-Pay-Later
  getKlarnaConfig() {
    return { supported: false, status: 'planned', provider: 'Klarna Payments', integration: 'Stripe Payment Element (automatically includes Klarna for eligible countries)', countries: ['DE', 'AT', 'SE', 'NO', 'FI', 'NL', 'GB'], message: 'Enable Klarna in Stripe Dashboard → Payment methods' };
  }

  // F-340: Kryptowährung als Zahlungsmethode
  getCryptoPaymentConfig() {
    return { supported: false, status: 'planned', providers: ['Coinbase Commerce', 'BitPay', 'Strike (Lightning)'], message: 'Crypto payments require dedicated payment processor; Stripe does not support crypto directly', currencies: ['BTC', 'ETH', 'USDC'] };
  }

  // F-342: USt-ID für Geschäftskunden (B2B)
  async setVatId(userId: string, vatId: string, countryCode: string) {
    await this.setSetting(`vat_id:${userId}`, { vatId, countryCode, verifiedAt: null, verificationStatus: 'PENDING' });
    return { userId, vatId, countryCode, verificationStatus: 'PENDING', message: 'VAT ID validation stub – integrate VIES API for EU VAT number validation' };
  }

  async getVatId(userId: string) {
    return this.getSetting<Record<string, unknown>>(`vat_id:${userId}`, { vatId: null, verificationStatus: 'NOT_SET' });
  }

  // F-343: Reverse Charge für EU-Geschäftskunden
  async getReverseChargeStatus(userId: string) {
    const vatData = await this.getSetting<{ vatId: string | null; countryCode: string | null; verificationStatus: string }>(`vat_id:${userId}`, { vatId: null, countryCode: null, verificationStatus: 'NOT_SET' });
    const platformCountry = 'AT';
    const isReverseCharge = vatData.vatId && vatData.countryCode && vatData.countryCode !== platformCountry;
    return { userId, reverseChargeApplies: !!isReverseCharge, vatId: vatData.vatId, message: isReverseCharge ? 'B2B cross-border EU transaction: reverse charge applies; no VAT charged' : 'No reverse charge; standard VAT applies' };
  }

  // F-352: Gutschein-Stack (mehrere Codes gleichzeitig)
  async redeemMultipleVouchers(userId: string, codes: string[]) {
    const results = [];
    for (const code of codes) {
      const promoCode = await this.prisma.promoCode.findUnique({ where: { code } });
      if (promoCode && promoCode.usesCount < (promoCode.maxUses ?? Infinity)) {
        results.push({ code, valid: true, discountPercent: promoCode.discountPercent });
      } else {
        results.push({ code, valid: false, reason: promoCode ? 'max_uses_reached' : 'not_found' });
      }
    }
    const totalDiscount = results.filter((r) => r.valid).reduce((s, r) => s + (r.discountPercent ?? 0), 0);
    return { userId, results, combinedDiscountPercent: Math.min(100, totalDiscount), message: 'Voucher stack stub – apply combined discount in checkout; cap at 100%' };
  }

  // F-353: Cashback-Programm
  async getCashbackBalance(userId: string) {
    const cashback = await this.getSetting<{ points: number; earnedCents: number }>(`cashback:${userId}`, { points: 0, earnedCents: 0 });
    return { userId, ...cashback, redeemUrl: '/api/v1/subscriptions/cashback/redeem' };
  }

  async addCashback(userId: string, loanId: string) {
    const key = `cashback:${userId}`;
    const current = await this.getSetting<{ points: number; earnedCents: number }>(key, { points: 0, earnedCents: 0 });
    const pointsPerLoan = 10;
    await this.setSetting(key, { points: current.points + pointsPerLoan, earnedCents: current.earnedCents + 50 });
    return { userId, loanId, pointsAdded: pointsPerLoan, newTotal: current.points + pointsPerLoan };
  }

  // F-354: Punkte gegen Gratis-Leihen einlösen
  async redeemCashbackPoints(userId: string, workId: string) {
    const key = `cashback:${userId}`;
    const current = await this.getSetting<{ points: number; earnedCents: number }>(key, { points: 0, earnedCents: 0 });
    const costPoints = 50;
    if (current.points < costPoints) throw new Error('insufficient_points');
    await this.setSetting(key, { ...current, points: current.points - costPoints });
    return { userId, workId, pointsSpent: costPoints, remainingPoints: current.points - costPoints, message: 'Points redeemed; create loan with free=true flag' };
  }

  // F-355: Loyalitätsstufen
  async getLoyaltyTier(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (!sub) return { tier: 'NONE', monthsActive: 0, benefits: [] };
    const monthsActive = Math.floor((Date.now() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const tier = monthsActive >= 24 ? 'GOLD' : monthsActive >= 12 ? 'SILVER' : monthsActive >= 3 ? 'BRONZE' : 'STARTER';
    const benefits: Record<string, string[]> = { STARTER: [], BRONZE: ['+5% cashback'], SILVER: ['+10% cashback', 'priority support'], GOLD: ['+15% cashback', 'priority support', 'early access'] };
    return { tier, monthsActive, benefits: benefits[tier] ?? [] };
  }

  // F-356: Abo-Jubiläum (Bonus-Leihe zum 1-Jahres-Geburtstag)
  async getAnniversaryBonus(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!sub) return { eligible: false };
    const daysSince = Math.floor((Date.now() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const yearsPassed = Math.floor(daysSince / 365);
    const alreadyClaimed = await this.getSetting<number>(`anniversary_claimed:${userId}`, 0);
    const eligible = yearsPassed > alreadyClaimed;
    return { eligible, yearsPassed, bonusLoans: eligible ? yearsPassed - alreadyClaimed : 0, message: eligible ? 'Claim bonus via POST /api/v1/subscriptions/anniversary/claim' : 'No unclaimed anniversary bonuses' };
  }

  async claimAnniversaryBonus(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!sub) throw new Error('no_active_subscription');
    const daysSince = Math.floor((Date.now() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const yearsPassed = Math.floor(daysSince / 365);
    const alreadyClaimed = await this.getSetting<number>(`anniversary_claimed:${userId}`, 0);
    if (yearsPassed <= alreadyClaimed) throw new Error('no_unclaimed_anniversary');
    const bonusLoans = yearsPassed - alreadyClaimed;
    await this.setSetting(`anniversary_claimed:${userId}`, yearsPassed);
    await this.prisma.subscription.update({ where: { id: sub.id }, data: { loanQuotaPerPeriod: { increment: bonusLoans } } });
    return { userId, bonusLoans, message: `${bonusLoans} bonus loan(s) added to your quota` };
  }

  // F-357: Früherbucher-Rabatt
  async getEarlyAdopterDiscount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) throw new Error('user_not_found');
    const cutoffDate = new Date('2025-01-01');
    const isEarlyAdopter = user.createdAt < cutoffDate;
    const discountPercent = isEarlyAdopter ? 20 : 0;
    return { userId, isEarlyAdopter, discountPercent, message: isEarlyAdopter ? 'Early adopter discount applies to plan upgrades' : 'Not an early adopter (joined after 2025-01-01)' };
  }

  // F-359: NGO-Abo
  async applyNgoDiscount(userId: string, orgName: string, registrationNumber: string) {
    await this.setSetting(`ngo:${userId}`, { orgName, registrationNumber, status: 'PENDING_REVIEW', appliedAt: new Date().toISOString() });
    return { userId, orgName, registrationNumber, status: 'PENDING_REVIEW', discountPercent: 30, message: 'NGO discount requires manual review; admin approves via admin panel' };
  }

  // F-360: Unternehmensabo
  async createEnterpriseSubscription(adminUserId: string, companyName: string, seats: number) {
    await this.setSetting(`enterprise:${adminUserId}`, { companyName, seats, usedSeats: 0, pricePerSeatCents: 699, active: true });
    return { adminUserId, companyName, seats, pricePerSeatCents: 699, totalMonthlyCents: seats * 699, message: 'Enterprise subscription stub – requires custom pricing agreement and seat management' };
  }

  async getEnterpriseSubscription(adminUserId: string) {
    return this.getSetting<Record<string, unknown>>(`enterprise:${adminUserId}`, { active: false });
  }

  // F-407: Mikrotransaktionen – Einzelkapitel kaufen/leihen
  async purchaseChapter(userId: string, workId: string, chapterIndex: number) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { title: true, loanPriceCents: true } });
    if (!work) throw new Error('work_not_found');
    const chapterPriceCents = Math.round((work.loanPriceCents ?? 99) / 10);
    return { userId, workId, chapterIndex, chapterPriceCents, message: 'Chapter microtransaction stub – requires chapter-level access control and Stripe one-time charge' };
  }

  // F-408: Token-basierte Währung (Credits)
  async getCreditBalance(userId: string) {
    const balance = await this.getSetting<number>(`credits:${userId}`, 0);
    return { userId, credits: balance, eurValueCents: balance * 10 };
  }

  // F-409: Credits kaufen
  async purchaseCredits(userId: string, amountCredits: number) {
    const key = `credits:${userId}`;
    const current = await this.getSetting<number>(key, 0);
    await this.setSetting(key, current + amountCredits);
    const priceCents = amountCredits * 10;
    return { userId, creditsPurchased: amountCredits, priceCents, newBalance: current + amountCredits, message: 'Credits stub – link to Stripe payment in production' };
  }

  // F-410: Credit-Transfer zwischen Nutzern
  async transferCredits(fromUserId: string, toUserId: string, amount: number) {
    const fromKey = `credits:${fromUserId}`;
    const toKey = `credits:${toUserId}`;
    const fromBalance = await this.getSetting<number>(fromKey, 0);
    if (fromBalance < amount) throw new Error('insufficient_credits');
    const toBalance = await this.getSetting<number>(toKey, 0);
    await this.setSetting(fromKey, fromBalance - amount);
    await this.setSetting(toKey, toBalance + amount);
    return { fromUserId, toUserId, amount, fromNewBalance: fromBalance - amount, toNewBalance: toBalance + amount };
  }

  // F-412: EU-VAT-Compliance-Report (OSS)
  async getEuVatComplianceReport(year: number, quarter: number) {
    return { year, quarter, format: 'OSS', countries: [], totalVatCents: 0, message: 'EU VAT OSS report stub – aggregate transactions by EU country and VAT rate; file via tax.europa.eu OSS portal' };
  }

  // F-413: Währungsauswahl
  getSupportedCurrencies() {
    return { currencies: ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'], default: 'EUR', message: 'Currency selection stub; store preferred currency in user profile; display prices via Stripe FX or ExchangeRate API' };
  }

  async setUserCurrency(userId: string, currency: string) {
    await this.setSetting(`currency:${userId}`, currency);
    return { userId, currency };
  }

  // F-414: Automatische Währungsumrechnung
  async convertCurrency(amountCents: number, fromCurrency: string, toCurrency: string) {
    return { amountCents, fromCurrency, toCurrency, convertedCents: amountCents, rate: 1.0, message: 'Currency conversion stub – use Stripe FX or fixer.io/exchangerate-api for live rates' };
  }

  // F-415: PPP-Anpassung (Purchasing Power Parity)
  getPppConfig() {
    return { enabled: false, status: 'planned', source: 'World Bank PPP data', countries: [{ code: 'IN', pppMultiplier: 0.3 }, { code: 'BR', pppMultiplier: 0.4 }, { code: 'PL', pppMultiplier: 0.5 }], message: 'PPP pricing requires geo-detection (IP → country) and price override per country' };
  }

  // F-416: Lokale Preisgestaltung für Schwellenländer
  async getLocalPrice(workId: string, countryCode: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { loanPriceCents: true } });
    if (!work) throw new Error('work_not_found');
    const discounts: Record<string, number> = { IN: 0.3, BR: 0.4, NG: 0.35, PH: 0.4, ID: 0.35 };
    const multiplier = discounts[countryCode] ?? 1.0;
    return { workId, countryCode, basePriceCents: work.loanPriceCents, localPriceCents: Math.round((work.loanPriceCents ?? 0) * multiplier), multiplier };
  }

  // F-418: Abo-Verlängerungs-Erinnerung 7 Tage vor Ablauf
  async getRenewalReminders(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' } });
    if (!sub) return { userId, hasActiveSubscription: false };
    const daysUntilExpiry = sub.currentPeriodEnd ? Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : -1;
    return { userId, currentPeriodEnd: sub.currentPeriodEnd ?? null, daysUntilExpiry, reminderSent: daysUntilExpiry <= 7, message: 'Renewal reminder is sent by SubscriptionsScheduler 7 days before period end' };
  }

  // F-419: Preiserhöhungs-Ankündigung 30 Tage vorher
  async getPriceIncreaseAnnouncement() {
    return this.getSetting<Record<string, unknown>>('price_increase_announcement', { active: false, newPriceCents: null, effectiveDate: null, noticeDate: null });
  }

  async setPriceIncreaseAnnouncement(newPriceCents: number, effectiveDate: string) {
    const noticeDate = new Date(new Date(effectiveDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.setSetting('price_increase_announcement', { active: true, newPriceCents, effectiveDate, noticeDate });
    return { newPriceCents, effectiveDate, noticeDate, message: 'Scheduler should send email to all active subscribers on noticeDate' };
  }

  // F-420: Bestandskunden-Schutz (Preis 12 Monate eingefroren)
  async getPriceFreezeStatus(userId: string) {
    const freeze = await this.getSetting<{ frozenUntil: string | null; frozenPriceCents: number | null }>(`price_freeze:${userId}`, { frozenUntil: null, frozenPriceCents: null });
    const isFrozen = freeze.frozenUntil ? new Date(freeze.frozenUntil) > new Date() : false;
    return { userId, isFrozen, frozenUntil: freeze.frozenUntil, frozenPriceCents: freeze.frozenPriceCents };
  }

  async applyPriceFreeze(userId: string, currentPriceCents: number) {
    const frozenUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await this.setSetting(`price_freeze:${userId}`, { frozenUntil, frozenPriceCents: currentPriceCents });
    return { userId, frozenUntil, frozenPriceCents: currentPriceCents, message: 'Price frozen for 12 months; scheduler must check this before applying price increase' };
  }
}
