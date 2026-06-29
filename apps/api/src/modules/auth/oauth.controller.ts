import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { OAuthService } from "./oauth.service";
import { AuthService } from "./auth.service";
import { generateToken } from "./token.util";

@Controller("auth/oauth")
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly auth: AuthService,
  ) {}

  // POST /api/v1/auth/oauth/callback – OAuth-Login / Registrierung (F-002/F-003)
  @Post("callback")
  @HttpCode(200)
  async callback(
    @Body()
    body: {
      provider: string;
      providerId: string;
      email?: string;
      displayName?: string;
    },
  ) {
    const { user, isNew } = await this.oauth.findOrCreateOAuthUser(
      body.provider,
      body.providerId,
      body.email,
      body.displayName,
    );
    const tokens = await this.auth.issueTokensPub(user.id, user.role, generateToken());
    return { ...tokens, isNew };
  }

  // POST /api/v1/auth/oauth/link – OAuth-Provider verknüpfen (authentifiziert)
  @Post("link")
  @UseGuards(JwtAuthGuard)
  link(
    @CurrentUser() userId: string,
    @Body()
    body: {
      provider: string;
      providerId: string;
      email?: string;
    },
  ) {
    return this.oauth.linkOAuthAccount(userId, body.provider, body.providerId, body.email);
  }

  // DELETE /api/v1/auth/oauth/:provider – OAuth-Link entfernen (authentifiziert)
  @Delete(":provider")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  unlink(
    @CurrentUser() userId: string,
    @Param("provider") provider: string,
  ) {
    return this.oauth.unlinkOAuthAccount(userId, provider);
  }

  // GET /api/v1/auth/oauth/accounts – verknüpfte Provider auflisten (authentifiziert)
  @Get("accounts")
  @UseGuards(JwtAuthGuard)
  accounts(@CurrentUser() userId: string) {
    return this.oauth.listOAuthAccounts(userId);
  }
}
