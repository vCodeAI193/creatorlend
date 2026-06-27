import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { LoansService } from "./loans.service";

/**
 * Endpunkte rund um das Leihen von Werken.
 * Auth/Guards (LISTENER) werden hier vereinfacht über req.userId angedeutet.
 */
@Controller("loans")
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  // POST /api/v1/loans – Werk leihen
  @Post()
  create(@Req() req: { userId: string }, @Body() body: { workId: string }) {
    return this.loans.borrow(req.userId, body.workId);
  }

  // GET /api/v1/loans?status=ACTIVE – eigene Ausleihen
  @Get()
  list(@Req() req: { userId: string }, @Query("status") status?: string) {
    return this.loans.listForUser(req.userId, status);
  }

  // GET /api/v1/loans/:id
  @Get(":id")
  get(@Req() req: { userId: string }, @Param("id") id: string) {
    return this.loans.getForUser(req.userId, id);
  }

  // POST /api/v1/loans/:id/renew – Verlängern (erneute Vergütung)
  @Post(":id/renew")
  renew(@Req() req: { userId: string }, @Param("id") id: string) {
    return this.loans.renew(req.userId, id);
  }

  // POST /api/v1/loans/:id/exchange – Tauschen gegen anderes Werk
  @Post(":id/exchange")
  exchange(
    @Req() req: { userId: string },
    @Param("id") id: string,
    @Body() body: { newWorkId: string },
  ) {
    return this.loans.exchange(req.userId, id, body.newWorkId);
  }
}
