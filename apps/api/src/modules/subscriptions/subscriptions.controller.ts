import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { SubscriptionsService } from "./subscriptions.service";
import { GiftCodesService } from "./gift-codes.service";
import { StudentDiscountService } from "./student-discount.service";
import { BillingStubsService } from "./billing-stubs.service";
import { PlanDto } from "./dto/plan.dto";

/** Abo-Verwaltung (Stripe Billing; Dev-Aktivierung ohne Stripe). */
@Controller("subscriptions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly giftCodes: GiftCodesService,
    private readonly studentDiscount: StudentDiscountService,
    private readonly billingStubs: BillingStubsService,
  ) {}

  // POST /api/v1/subscriptions – Abo abschließen (Stripe Checkout)
  @Post()
  create(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.createCheckout(userId, body.plan);
  }

  // POST /api/v1/subscriptions/activate – Dev-Aktivierung ohne Stripe
  @Post("activate")
  activate(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.activateDev(userId, body.plan);
  }

  // POST /api/v1/subscriptions/trial – kostenlose Testphase starten (B-086)
  @Post("trial")
  trial(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.startTrial(userId, body.plan);
  }

  // GET /api/v1/subscriptions/me – aktuelles Abo
  @Get("me")
  me(@CurrentUser() userId: string) {
    return this.subscriptions.getForUser(userId);
  }

  // PATCH /api/v1/subscriptions/me – Plan wechseln
  @Patch("me")
  change(@CurrentUser() userId: string, @Body() body: PlanDto) {
    return this.subscriptions.changePlan(userId, body.plan);
  }

  // DELETE /api/v1/subscriptions/me – zum Periodenende kündigen
  @Delete("me")
  cancel(@CurrentUser() userId: string) {
    return this.subscriptions.cancel(userId);
  }

  // POST /api/v1/subscriptions/billing-portal – Stripe Billing Portal (B-091)
  @Post("billing-portal")
  billingPortal(@CurrentUser() userId: string) {
    return this.subscriptions.getBillingPortalUrl(userId);
  }

  // POST /api/v1/subscriptions/setup-intent – Kreditkarte via Stripe Elements speichern (F-334)
  @Post("setup-intent")
  createSetupIntent(@CurrentUser() userId: string) {
    return this.subscriptions.createSetupIntent(userId);
  }

  // POST /api/v1/subscriptions/me/upgrade – Plan-Upgrade mit Prorating (F-348)
  @Post("me/upgrade")
  upgradePlan(@CurrentUser() userId: string, @Body("plan") plan: string) {
    return this.subscriptions.upgradePlanWithProration(userId, plan);
  }

  // POST /api/v1/subscriptions/me/downgrade – Downgrade am Periodenende (F-349)
  @Post("me/downgrade")
  downgradePlan(@CurrentUser() userId: string, @Body("plan") plan: string) {
    return this.subscriptions.scheduleDowngrade(userId, plan);
  }

  // GET /api/v1/subscriptions/billing-history – Abrechnungshistorie (B-090)
  @Get("billing-history")
  billingHistory(@CurrentUser() userId: string, @Query("page") page = "1") {
    return this.subscriptions.getBillingHistory(userId, Number(page));
  }

  // POST /api/v1/subscriptions/me/pause – Abo pausieren (F-529)
  @Post("me/pause")
  pause(
    @CurrentUser() userId: string,
    @Body("resumeInDays") resumeInDays?: number,
  ) {
    return this.subscriptions.pauseSubscription(userId, resumeInDays);
  }

  // POST /api/v1/subscriptions/me/resume – Abo fortsetzen (F-529)
  @Post("me/resume")
  resume(@CurrentUser() userId: string) {
    return this.subscriptions.resumeSubscription(userId);
  }

  // POST /api/v1/subscriptions/gift – Geschenk-Code erstellen (F-239)
  @Post("gift")
  createGiftCode(
    @CurrentUser() userId: string,
    @Body()
    body: {
      planId: string;
      durationDays?: number;
      recipientEmail?: string;
      expiresAt?: string;
    },
  ) {
    return this.giftCodes.createGiftCode(
      userId,
      body.planId,
      body.durationDays ?? 30,
      body.recipientEmail,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  // POST /api/v1/subscriptions/gift/redeem – Geschenk-Code einlösen (F-240)
  @Post("gift/redeem")
  @HttpCode(200)
  redeemGiftCode(
    @CurrentUser() userId: string,
    @Body("code") code: string,
  ) {
    return this.giftCodes.redeemGiftCode(userId, code);
  }

  // POST /api/v1/subscriptions/addon – Leih-Kontingent aufstocken (F-350)
  @Post("addon")
  purchaseAddon(@CurrentUser() userId: string, @Body("extraLoans") extraLoans: number) {
    return this.subscriptions.purchaseAddon(userId, extraLoans);
  }

  // GET /api/v1/subscriptions/addon – eigene Addon-Käufe auflisten (F-350)
  @Get("addon")
  listAddons(@CurrentUser() userId: string) {
    return this.subscriptions.listAddons(userId);
  }

  // POST /api/v1/subscriptions/student – Studentenrabatt beantragen (F-044)
  @Post("student")
  applyStudentDiscount(@CurrentUser() userId: string, @Body("eduEmail") eduEmail: string) {
    return this.studentDiscount.applyForDiscount(userId, eduEmail);
  }

  // POST /api/v1/subscriptions/student/verify – Studentenstatus verifizieren (F-044)
  @Post("student/verify")
  verifyStudent(@CurrentUser() userId: string, @Body("token") token: string) {
    return this.studentDiscount.verifyStudent(userId, token);
  }

  // GET /api/v1/subscriptions/student – Studentenstatus abrufen (F-044)
  @Get("student")
  studentStatus(@CurrentUser() userId: string) {
    return this.studentDiscount.checkStudentStatus(userId);
  }

  // GET /api/v1/subscriptions/plans – Plan-Vergleich (F-501)
  @Get("plans")
  getPlans() {
    return this.subscriptions.getPlans();
  }

  // GET /api/v1/subscriptions/plans/annual – Jahres-Abo mit Gratis-Monat (F-417)
  @Get("plans/annual")
  getAnnualPlans() {
    return this.subscriptions.getAnnualPlans();
  }

  // DELETE /api/v1/subscriptions/me – Kündigung (F-502)
  // Note: existing DELETE /me calls cancel(), this aliases cancelSubscription()
  // POST /api/v1/subscriptions/me/cancel – Kündigung mit Bestätigung (F-502)
  @Post("me/cancel")
  cancelSubscription(@CurrentUser() userId: string) {
    return this.subscriptions.cancelSubscription(userId);
  }

  // POST /api/v1/subscriptions/me/reactivate – Reaktivierung (F-503)
  @Post("me/reactivate")
  reactivate(@CurrentUser() userId: string) {
    return this.subscriptions.reactivate(userId);
  }

  // GET /api/v1/subscriptions/payment-methods – Verfügbare Zahlungsmethoden (F-335/336/338/339)
  @Get("payment-methods")
  getPaymentMethods() {
    return this.subscriptions.getAvailablePaymentMethods();
  }

  // GET /api/v1/subscriptions/payment-methods/sepa – SEPA-Info (F-335)
  @Get("payment-methods/sepa")
  sepaInfo() {
    return this.subscriptions.getSepaInfo();
  }

  // GET /api/v1/subscriptions/payment-methods/paypal – PayPal-Info (F-336)
  @Get("payment-methods/paypal")
  paypalInfo() {
    return this.subscriptions.getPaypalInfo();
  }

  // GET /api/v1/subscriptions/payment-methods/apple-pay – Apple Pay-Info (F-338)
  @Get("payment-methods/apple-pay")
  applePayInfo() {
    return this.subscriptions.getApplePayInfo();
  }

  // GET /api/v1/subscriptions/payment-methods/google-pay – Google Pay-Info (F-339)
  @Get("payment-methods/google-pay")
  googlePayInfo() {
    return this.subscriptions.getGooglePayInfo();
  }

  // ─── F-330/F-331/F-332/F-333: Freemium & Ads ─────────────────────────

  // GET /api/v1/subscriptions/freemium/works – Freemium-Werke (F-330)
  @Get("freemium/works")
  getFreemiumWorks(@Query("limit") limit?: string) {
    return this.billingStubs.getFreemiumWorks(limit ? Number(limit) : 20);
  }

  // GET /api/v1/subscriptions/ads/config – Audio-Ad-Konfig (F-331)
  @Get("ads/config")
  getAudioAdConfig() {
    return this.billingStubs.getAudioAdConfig();
  }

  // GET /api/v1/subscriptions/ads/server – Ad-Server-Integration (F-332)
  @Get("ads/server")
  getAdServerConfig() {
    return this.billingStubs.getAdServerConfig();
  }

  // GET /api/v1/subscriptions/ads/free – Werbefrei für zahlende Nutzer:innen (F-333)
  @Get("ads/free")
  isAdFree(@CurrentUser() userId: string) {
    return this.billingStubs.isAdFree(userId);
  }

  // ─── F-337/F-340: Alternative Payment Methods ────────────────────────

  // GET /api/v1/subscriptions/payment-methods/klarna – Klarna/BNPL (F-337)
  @Get("payment-methods/klarna")
  getKlarnaConfig() {
    return this.billingStubs.getKlarnaConfig();
  }

  // GET /api/v1/subscriptions/payment-methods/crypto – Kryptowährung (F-340)
  @Get("payment-methods/crypto")
  getCryptoPaymentConfig() {
    return this.billingStubs.getCryptoPaymentConfig();
  }

  // ─── F-342/F-343: VAT & Reverse Charge ───────────────────────────────

  // PUT /api/v1/subscriptions/vat-id – USt-ID hinterlegen (F-342)
  @Put("vat-id")
  setVatId(
    @CurrentUser() userId: string,
    @Body("vatId") vatId: string,
    @Body("countryCode") countryCode: string,
  ) {
    return this.billingStubs.setVatId(userId, vatId, countryCode);
  }

  // GET /api/v1/subscriptions/vat-id – USt-ID abrufen (F-342)
  @Get("vat-id")
  getVatId(@CurrentUser() userId: string) {
    return this.billingStubs.getVatId(userId);
  }

  // GET /api/v1/subscriptions/reverse-charge – Reverse-Charge-Status (F-343)
  @Get("reverse-charge")
  getReverseChargeStatus(@CurrentUser() userId: string) {
    return this.billingStubs.getReverseChargeStatus(userId);
  }

  // ─── F-352/F-353/F-354/F-355/F-356/F-357: Loyalty & Vouchers ────────

  // POST /api/v1/subscriptions/vouchers/stack – Gutschein-Stack einlösen (F-352)
  @Post("vouchers/stack")
  redeemMultipleVouchers(@CurrentUser() userId: string, @Body("codes") codes: string[]) {
    return this.billingStubs.redeemMultipleVouchers(userId, codes);
  }

  // GET /api/v1/subscriptions/cashback – Cashback-Guthaben (F-353)
  @Get("cashback")
  getCashbackBalance(@CurrentUser() userId: string) {
    return this.billingStubs.getCashbackBalance(userId);
  }

  // POST /api/v1/subscriptions/cashback/redeem – Punkte einlösen (F-354)
  @Post("cashback/redeem")
  redeemCashbackPoints(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
  ) {
    return this.billingStubs.redeemCashbackPoints(userId, workId);
  }

  // GET /api/v1/subscriptions/loyalty – Loyalitätsstufe (F-355)
  @Get("loyalty")
  getLoyaltyTier(@CurrentUser() userId: string) {
    return this.billingStubs.getLoyaltyTier(userId);
  }

  // GET /api/v1/subscriptions/anniversary – Jubiläums-Bonus (F-356)
  @Get("anniversary")
  getAnniversaryBonus(@CurrentUser() userId: string) {
    return this.billingStubs.getAnniversaryBonus(userId);
  }

  // POST /api/v1/subscriptions/anniversary/claim – Jubiläums-Bonus einlösen (F-356)
  @Post("anniversary/claim")
  claimAnniversaryBonus(@CurrentUser() userId: string) {
    return this.billingStubs.claimAnniversaryBonus(userId);
  }

  // GET /api/v1/subscriptions/early-adopter – Früherbucher-Rabatt (F-357)
  @Get("early-adopter")
  getEarlyAdopterDiscount(@CurrentUser() userId: string) {
    return this.billingStubs.getEarlyAdopterDiscount(userId);
  }

  // ─── F-359/F-360: Special Pricing ────────────────────────────────────

  // POST /api/v1/subscriptions/ngo – NGO-Rabatt beantragen (F-359)
  @Post("ngo")
  applyNgoDiscount(
    @CurrentUser() userId: string,
    @Body("orgName") orgName: string,
    @Body("registrationNumber") registrationNumber: string,
  ) {
    return this.billingStubs.applyNgoDiscount(userId, orgName, registrationNumber);
  }

  // POST /api/v1/subscriptions/enterprise – Unternehmensabo anlegen (F-360)
  @Post("enterprise")
  createEnterpriseSubscription(
    @CurrentUser() userId: string,
    @Body("companyName") companyName: string,
    @Body("seats") seats: number,
  ) {
    return this.billingStubs.createEnterpriseSubscription(userId, companyName, seats);
  }

  // GET /api/v1/subscriptions/enterprise – Unternehmensabo abrufen (F-360)
  @Get("enterprise")
  getEnterpriseSubscription(@CurrentUser() userId: string) {
    return this.billingStubs.getEnterpriseSubscription(userId);
  }

  // ─── F-407/F-408/F-409/F-410: Micro & Credits ────────────────────────

  // POST /api/v1/subscriptions/chapter-purchase – Einzelkapitel kaufen (F-407)
  @Post("chapter-purchase")
  purchaseChapter(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("chapterIndex") chapterIndex: number,
  ) {
    return this.billingStubs.purchaseChapter(userId, workId, chapterIndex);
  }

  // GET /api/v1/subscriptions/credits – Credit-Guthaben (F-408/F-409)
  @Get("credits")
  getCreditBalance(@CurrentUser() userId: string) {
    return this.billingStubs.getCreditBalance(userId);
  }

  // POST /api/v1/subscriptions/credits/purchase – Credits kaufen (F-409)
  @Post("credits/purchase")
  purchaseCredits(@CurrentUser() userId: string, @Body("amount") amount: number) {
    return this.billingStubs.purchaseCredits(userId, amount);
  }

  // POST /api/v1/subscriptions/credits/transfer – Credits übertragen (F-410)
  @Post("credits/transfer")
  transferCredits(
    @CurrentUser() userId: string,
    @Body("toUserId") toUserId: string,
    @Body("amount") amount: number,
  ) {
    return this.billingStubs.transferCredits(userId, toUserId, amount);
  }

  // ─── F-412/F-413/F-414/F-415/F-416: Currency & Tax ───────────────────

  // GET /api/v1/subscriptions/vat/eu-compliance – EU-VAT-Report (F-412)
  @Get("vat/eu-compliance")
  getEuVatComplianceReport(@Query("year") year?: string, @Query("quarter") quarter?: string) {
    return this.billingStubs.getEuVatComplianceReport(year ? Number(year) : new Date().getFullYear(), quarter ? Number(quarter) : 1);
  }

  // GET /api/v1/subscriptions/currencies – Währungsauswahl (F-413)
  @Get("currencies")
  getSupportedCurrencies() {
    return this.billingStubs.getSupportedCurrencies();
  }

  // PUT /api/v1/subscriptions/currency – Bevorzugte Währung setzen (F-413)
  @Put("currency")
  setUserCurrency(@CurrentUser() userId: string, @Body("currency") currency: string) {
    return this.billingStubs.setUserCurrency(userId, currency);
  }

  // GET /api/v1/subscriptions/currency/convert – Währungsumrechnung (F-414)
  @Get("currency/convert")
  convertCurrency(
    @Query("amountCents") amountCents?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.billingStubs.convertCurrency(Number(amountCents ?? 0), from ?? 'EUR', to ?? 'EUR');
  }

  // GET /api/v1/subscriptions/ppp/config – PPP-Anpassung (F-415)
  @Get("ppp/config")
  getPppConfig() {
    return this.billingStubs.getPppConfig();
  }

  // GET /api/v1/subscriptions/local-price/:workId – lokale Preisgestaltung (F-416)
  @Get("local-price/:workId")
  getLocalPrice(@Param("workId") workId: string, @Query("country") country?: string) {
    return this.billingStubs.getLocalPrice(workId, country ?? 'DE');
  }

  // ─── F-418/F-419/F-420: Renewal & Price Policy ───────────────────────

  // GET /api/v1/subscriptions/renewal-reminder – Verlängerungs-Erinnerung (F-418)
  @Get("renewal-reminder")
  getRenewalReminders(@CurrentUser() userId: string) {
    return this.billingStubs.getRenewalReminders(userId);
  }

  // GET /api/v1/subscriptions/price-increase – Preiserhöhungs-Ankündigung (F-419)
  @Get("price-increase")
  getPriceIncreaseAnnouncement() {
    return this.billingStubs.getPriceIncreaseAnnouncement();
  }

  // POST /api/v1/subscriptions/price-increase – Preiserhöhung ankündigen (F-419)
  @Post("price-increase")
  @Roles(UserRole.ARTIST)
  setPriceIncreaseAnnouncement(
    @Body("newPriceCents") newPriceCents: number,
    @Body("effectiveDate") effectiveDate: string,
  ) {
    return this.billingStubs.setPriceIncreaseAnnouncement(newPriceCents, effectiveDate);
  }

  // GET /api/v1/subscriptions/price-freeze – Preisschutz-Status (F-420)
  @Get("price-freeze")
  getPriceFreezeStatus(@CurrentUser() userId: string) {
    return this.billingStubs.getPriceFreezeStatus(userId);
  }

  // POST /api/v1/subscriptions/price-freeze – Preisschutz aktivieren (F-420)
  @Post("price-freeze")
  applyPriceFreeze(
    @CurrentUser() userId: string,
    @Body("currentPriceCents") currentPriceCents: number,
  ) {
    return this.billingStubs.applyPriceFreeze(userId, currentPriceCents);
  }
}
