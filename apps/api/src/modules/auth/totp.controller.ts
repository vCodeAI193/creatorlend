import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { TotpService } from "./totp.service";

@Controller("auth/2fa")
@UseGuards(JwtAuthGuard)
export class TotpController {
  constructor(private readonly totp: TotpService) {}

  // POST /api/v1/auth/2fa/setup – TOTP-Secret generieren (F-005)
  @Post("setup")
  setup(@CurrentUser() userId: string) {
    return this.totp.generateSecret(userId);
  }

  // POST /api/v1/auth/2fa/enable – 2FA aktivieren (F-005)
  @Post("enable")
  @HttpCode(200)
  enable(
    @CurrentUser() userId: string,
    @Body("token") token: string,
  ) {
    return this.totp.enableTotp(userId, token);
  }

  // DELETE /api/v1/auth/2fa/disable – 2FA deaktivieren (F-005)
  @Delete("disable")
  @HttpCode(200)
  disable(
    @CurrentUser() userId: string,
    @Body("token") token: string,
  ) {
    return this.totp.disableTotp(userId, token);
  }

  // POST /api/v1/auth/2fa/verify – Token prüfen (Login-Flow) (F-005)
  @Post("verify")
  @HttpCode(200)
  verify(
    @CurrentUser() userId: string,
    @Body("token") token: string,
  ) {
    return this.totp.verifyToken(userId, token);
  }
}
