import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { LoansService } from "./loans.service";
import { BorrowDto } from "./dto/borrow.dto";
import { ExchangeDto } from "./dto/exchange.dto";

/** Endpunkte rund um das Leihen von Werken (nur Hörer:innen). */
@Controller("loans")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LISTENER)
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  // POST /api/v1/loans – Werk leihen
  @Post()
  create(@CurrentUser() userId: string, @Body() body: BorrowDto) {
    return this.loans.borrow(userId, body.workId);
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
}
