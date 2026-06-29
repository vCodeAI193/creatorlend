import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'node:crypto';

@Injectable()
export class OAuthServerService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  // Issue an authorization code for a registered OAuth client (stub)
  async authorize(clientId: string, redirectUri: string, scope: string, userId: string) {
    const code = randomBytes(16).toString('hex');
    const prefix = `oauth_${code.slice(0, 8)}`;
    await this.prisma.apiKey.create({
      data: { userId, name: `oauth:${clientId}:${code}`, keyHash: code, prefix, scopes: [scope] },
    });
    return { code, redirectUri: `${redirectUri}?code=${code}&state=ok` };
  }

  // Exchange code for access token
  async token(code: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { keyHash: code } });
    if (!key) throw new Error('invalid_code');
    const accessToken = this.jwt.sign({ sub: key.userId, scopes: key.scopes }, { expiresIn: '1h' });
    return { access_token: accessToken, token_type: 'Bearer', expires_in: 3600, scope: key.scopes.join(' ') };
  }
}
