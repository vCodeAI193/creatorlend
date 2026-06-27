import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
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

  // GET /api/v1/loans/:id
  @Get(":id")
  get(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.getForUser(userId, id);
  }

  // POST /api/v1/loans/:id/renew – Verlängern (erneute Vergütung)
  @Post(":id/renew")
  renew(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.loans.renew(userId, id);
  }

  // POST /api/v1/loans/:id/exchange – Tauschen gegen anderes Werk
  @Post(":id/exchange")
  exchange(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: ExchangeDto,
  ) {
    return this.loans.exchange(userId, id, body.newWorkId);
  }
}
