import { Injectable, NestMiddleware } from "@nestjs/common";

@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const acceptLanguage = req.headers["accept-language"];
    if (acceptLanguage) {
      req.detectedLanguage = acceptLanguage.split(",")[0].split("-")[0];
    }
    next();
  }
}
