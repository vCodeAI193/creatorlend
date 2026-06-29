import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

const DEPRECATED_ROUTES: Record<string, string> = {};

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const key = `${req.method} ${req.path}`;
    const notice = DEPRECATED_ROUTES[key];
    if (notice) {
      const res = context.switchToHttp().getResponse();
      res.setHeader("Deprecation", "true");
      res.setHeader("Sunset", notice);
    }
    return next.handle();
  }
}
