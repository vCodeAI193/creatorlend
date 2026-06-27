import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface AuthedRequest {
  headers: { authorization?: string };
  userId: string;
  userRole: string;
}

/**
 * Liest das Bearer-Token, verifiziert es und hängt userId/userRole an den
 * Request. Quelle des Payloads: AuthService.issueTokens ({ sub, role }).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("missing_bearer_token");
    }

    try {
      const payload = this.jwt.verify<{ sub: string; role: string }>(token);
      req.userId = payload.sub;
      req.userRole = payload.role;
      return true;
    } catch {
      throw new UnauthorizedException("invalid_token");
    }
  }
}
