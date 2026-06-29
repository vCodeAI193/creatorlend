import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.id = req.headers["x-request-id"] ?? randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
  }
}
