import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@creatorlend/shared";
import { ROLES_KEY } from "./roles.decorator";
import type { AuthedRequest } from "./jwt-auth.guard";

/**
 * Erzwingt die per @Roles(...) deklarierten Rollen. Muss NACH dem
 * JwtAuthGuard laufen, damit req.userRole gesetzt ist.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    // ADMIN-Rolle hat Zugriff auf alle geschützten Routen
    if (req.userRole === "ADMIN") return true;
    if (!required.includes(req.userRole as UserRole)) {
      throw new ForbiddenException("insufficient_role");
    }
    return true;
  }
}
