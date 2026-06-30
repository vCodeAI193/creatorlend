import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

// F-877: OAuth 2.0 Authorization Server Stub
@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Authorization Code Flow: generiere Auth-Code
  async authorize(clientId: string, redirectUri: string, scope: string, userId: string): Promise<string> {
    const code = randomBytes(16).toString('hex');
    // In production: persist code with expiry
    return code;
  }

  // Token-Austausch (Authorization Code → Access Token)
  async exchangeCode(clientId: string, code: string, redirectUri: string): Promise<{ access_token: string; token_type: string; expires_in: number; scope: string }> {
    // Stub: validate code (in production: verify against stored codes)
    if (!code) throw new UnauthorizedException('invalid_grant');
    const payload = { sub: 'oauth_user', client_id: clientId, scope: 'read' };
    const access_token = this.jwt.sign(payload, { expiresIn: '1h' });
    return { access_token, token_type: 'Bearer', expires_in: 3600, scope: 'read' };
  }

  // Client-Credentials Flow (für M2M)
  async clientCredentials(clientId: string, clientSecret: string, scope: string) {
    // Stub validation
    if (!clientId || !clientSecret) throw new UnauthorizedException('invalid_client');
    const payload = { sub: clientId, scope, grant_type: 'client_credentials' };
    const access_token = this.jwt.sign(payload, { expiresIn: '1h' });
    return { access_token, token_type: 'Bearer', expires_in: 3600, scope };
  }

  // Zapier-Integration-Stub (F-887)
  getZapierInfo() {
    return {
      name: 'CreatorLend',
      authType: 'oauth2',
      authUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/oauth/authorize`,
      tokenUrl: `${process.env.API_BASE_URL ?? 'https://api.creatorlend.com'}/oauth/token`,
      triggers: ['loan.created', 'subscription.created', 'work.published', 'payout.completed'],
      actions: ['send_notification', 'create_promo_code'],
    };
  }
}
