import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthedRequest } from "../modules/auth/jwt-auth.guard";

/** Liefert die userId aus dem (vom JwtAuthGuard befüllten) Request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.userId;
  },
);
