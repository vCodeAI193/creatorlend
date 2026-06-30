import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { PromoCodesService } from "./promo-codes.service";

@Controller("promo-codes")
@UseGuards(JwtAuthGuard)
export class PromoCodesController {
  constructor(private readonly promoCodes: PromoCodesService) {}

  // POST /api/v1/promo-codes/validate – Code prüfen
  @Post("validate")
  validate(
    @CurrentUser() userId: string,
    @Body("code") code: string,
    @Body("plan") plan?: string,
  ) {
    return this.promoCodes.validate(code, userId, plan);
  }

  // POST /api/v1/promo-codes/redeem – Code einlösen
  @Post("redeem")
  redeem(
    @CurrentUser() userId: string,
    @Body("code") code: string,
    @Body("plan") plan?: string,
  ) {
    return this.promoCodes.redeem(code, userId, plan);
  }

  // POST /api/v1/promo-codes/artist – Künstler:in erstellt Rabattcode (F-383)
  @Post("artist")
  createArtistCode(
    @CurrentUser() artistId: string,
    @Body("code") code: string,
    @Body("discountPercent") discountPercent: number,
    @Body("maxUses") maxUses?: number,
    @Body("expiresAt") expiresAt?: string,
  ) {
    return this.promoCodes.createArtistCode(artistId, code, discountPercent, maxUses, expiresAt);
  }
}
