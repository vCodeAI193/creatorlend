import { Controller, Get, Post, Query, Req } from "@nestjs/common";
import { PayoutsService } from "./payouts.service";

/** Vergütung & Auszahlungen für Künstler:innen. */
@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  // GET /api/v1/payouts/summary – aggregierte Vergütung
  @Get("summary")
  summary(@Req() req: { userId: string }) {
    return this.payouts.summary(req.userId);
  }

  // GET /api/v1/payouts/items – Einzelposten je Ausleihe
  @Get("items")
  items(
    @Req() req: { userId: string },
    @Query("status") status?: string,
    @Query("page") page = "1",
  ) {
    return this.payouts.items(req.userId, status, Number(page));
  }

  // POST /api/v1/payouts/withdraw – Auszahlung via Stripe Connect anstoßen
  @Post("withdraw")
  withdraw(@Req() req: { userId: string }) {
    return this.payouts.withdraw(req.userId);
  }
}
