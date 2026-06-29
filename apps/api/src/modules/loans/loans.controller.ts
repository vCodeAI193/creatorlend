import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { LoansService } from "./loans.service";
import { LoanGiftsService } from "./loan-gifts.service";
import { SingleLoanService } from "./single-loan.service";
import { DownloadService } from "./download.service";
import { BorrowDto } from "./dto/borrow.dto";
import { ExchangeDto } from "./dto/exchange.dto";

/** Endpunkte rund um das Leihen von Werken (nur Hörer:innen). */
@Controller("loans")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly loanGifts: LoanGiftsService,
    private readonly singleLoan: SingleLoanService,
    private readonly download: DownloadService,
  ) {}

  // GET /api/v1/loans/expired-check – prüfen welche Ausleihen abgelaufen sind (F-855)
  @Get("expired-check")
  checkExpiredDownloads(@CurrentUser() userId: string) {
    return this.download.checkExpiredDownloads(userId);
  }

  // POST /api/v1/loans – Werk leihen
  @Post()
  create(@CurrentUser() userId: string, @Body() body: BorrowDto) {
    return this.loans.borrow(userId, body.workId);
  }

  // POST /api/v1/loans/purchase – Pay-per-loan: Kauf einleiten (F-321)
  @Post("purchase")
  initiatePurchase(@CurrentUser() userId: string, @Body("workId") workId: string) {
    return this.singleLoan.initiatePurchase(userId, workId);
  }

  // POST /api/v1/loans/purchase/:id/complete – Pay-per-loan: Kauf abschließen (F-321)
  @Post("purchase/:id/complete")
  completePurchase(@Param("id") id: string) {
    return this.singleLoan.completePurchase(id);
  }

  // GET /api/v1/loans?status=ACTIVE – eigene Ausleihen
  @Get()
  list(@CurrentUser() userId: string, @Query("status") status?: string) {
    return this.loans.listForUser(userId, status);
  }

  // GET /api/v1/loans/stats – Hör-Statistiken (F-270-272)
  @Get("stats")
  listeningStats(@CurrentUser() userId: string) {
    return this.loans.getListeningStats(userId);
  }

  // GET /api/v1/loans/year-in-review?year=2026 – Jahresrückblick (F-271)
  @Get("year-in-review")
  yearInReview(@CurrentUser() userId: string, @Query("year") year?: string) {
    return this.loans.getYearInReview(userId, year ? Number(year) : new Date().getFullYear());
  }

  // GET /api/v1/loans/:id/download – Download-URL für eine Leihe (F-852/F-853)
  @Get(":id/download")
  getDownloadUrl(@CurrentUser() userId: string, @Param("id") loanId: string) {
    return this.download.getDownloadUrl(userId, loanId);
  }

  // GET /api/v1/loans/:id
  @Get(":id")
  get(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getForUser(userId, id);
  }

  // DELETE /api/v1/loans/:id – Stornieren innerhalb Kulanzfrist (B-081)
  @Delete(":id")
  cancel(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.cancel(userId, id);
  }

  // POST /api/v1/loans/:id/renew – Verlängern (erneute Vergütung)
  @Post(":id/renew")
  renew(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.renew(userId, id);
  }

  // POST /api/v1/loans/:id/exchange – Tauschen gegen anderes Werk (B-078)
  @Post(":id/exchange")
  exchange(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: ExchangeDto,
  ) {
    return this.loans.exchange(userId, id, body.newWorkId, body.countsAgainstQuota ?? false);
  }

  // PUT /api/v1/loans/:id/progress – Abspielposition speichern (B-073)
  @Put(":id/progress")
  saveProgress(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("positionSeconds") positionSeconds: number,
  ) {
    return this.loans.saveProgress(userId, id, positionSeconds);
  }

  // GET /api/v1/loans/:id/progress – gespeicherte Position abrufen (B-073)
  @Get(":id/progress")
  getProgress(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getProgress(userId, id);
  }

  // ─── F-251/F-252: Multi-device loan access ─────────────────────────────

  // POST /api/v1/loans/:id/devices – Gerät registrieren
  @Post(":id/devices")
  registerDevice(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("deviceId") deviceId: string,
    @Body("userAgent") userAgent?: string,
  ) {
    return this.loans.registerDevice(userId, id, deviceId, userAgent);
  }

  // GET /api/v1/loans/:id/devices – Geräte auflisten
  @Get(":id/devices")
  getDevices(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getDevices(userId, id);
  }

  // ─── F-267: Loan Pause (Vacation Mode) ─────────────────────────────────

  // POST /api/v1/loans/:id/pause – Leihe pausieren
  @Post(":id/pause")
  pause(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body("days") days: number,
  ) {
    return this.loans.pause(userId, id, days);
  }

  // POST /api/v1/loans/:id/resume – Leihe-Pause beenden
  @Post(":id/resume")
  resume(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.resume(userId, id);
  }

  // ─── F-260: Scheduled/Reserved Loan ────────────────────────────────────

  // POST /api/v1/loans/reserve – Reservierung anlegen
  @Post("reserve")
  reserve(
    @CurrentUser() userId: string,
    @Body("workId") workId: string,
    @Body("scheduledAt") scheduledAt: string,
  ) {
    return this.loans.reserve(userId, workId, new Date(scheduledAt));
  }

  // DELETE /api/v1/loans/reserve/:id – Reservierung stornieren
  @Delete("reserve/:id")
  cancelReservation(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.cancelReservation(userId, id);
  }

  // GET /api/v1/loans/reservations – Reservierungen auflisten
  @Get("reservations")
  listReservations(@CurrentUser() userId: string) {
    return this.loans.listReservations(userId);
  }

  // ─── F-259: Gift a Loan ─────────────────────────────────────────────────

  // POST /api/v1/loans/gifts/send – Leihe verschenken
  @Post("gifts/send")
  sendGift(
    @CurrentUser() userId: string,
    @Body("recipientId") recipientId: string,
    @Body("workId") workId: string,
    @Body("message") message?: string,
  ) {
    return this.loanGifts.send(userId, recipientId, workId, message);
  }

  // POST /api/v1/loans/gifts/:id/accept – Geschenk annehmen
  @Post("gifts/:id/accept")
  acceptGift(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loanGifts.accept(userId, id);
  }

  // POST /api/v1/loans/gifts/:id/decline – Geschenk ablehnen
  @Post("gifts/:id/decline")
  declineGift(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loanGifts.decline(userId, id);
  }

  // GET /api/v1/loans/gifts/received – empfangene Geschenke
  @Get("gifts/received")
  listReceivedGifts(@CurrentUser() userId: string) {
    return this.loanGifts.listReceived(userId);
  }

  // GET /api/v1/loans/gifts/sent – gesendete Geschenke
  @Get("gifts/sent")
  listSentGifts(@CurrentUser() userId: string) {
    return this.loanGifts.listSent(userId);
  }
}
