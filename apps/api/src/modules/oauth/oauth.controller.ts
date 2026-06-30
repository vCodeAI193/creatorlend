import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { OAuthService } from './oauth.service';

// F-877: OAuth 2.0 Authorization Server Endpoints
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  // GET /api/v1/oauth/authorize?client_id=...&redirect_uri=...&scope=...
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @CurrentUser() user: { userId: string },
  ) {
    const code = await this.oauth.authorize(clientId, redirectUri, scope, user.userId);
    return { code, redirect_uri: redirectUri };
  }

  // POST /api/v1/oauth/token – Code austauschen
  @Post('token')
  async token(
    @Body('grant_type') grantType: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('scope') scope: string,
  ) {
    if (grantType === 'client_credentials') {
      return this.oauth.clientCredentials(clientId, clientSecret, scope ?? 'read');
    }
    return this.oauth.exchangeCode(clientId, code, redirectUri);
  }

  // F-887: Zapier-Integration-Info
  @Get('zapier')
  zapierInfo() {
    return this.oauth.getZapierInfo();
  }
}
