import { Injectable, NestMiddleware } from '@nestjs/common';

// F-991: Setzt req.locale aus Accept-Language-Header
@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Record<string, unknown> & { headers: Record<string, string | string[] | undefined> }, _res: unknown, next: () => void) {
    const lang = req.headers['accept-language'];
    if (lang) {
      const langStr = Array.isArray(lang) ? lang[0] : lang;
      const primary = langStr.split(',')[0].split(';')[0].trim().substring(0, 2).toLowerCase();
      const supported = ['de', 'en', 'fr', 'es'];
      req.locale = supported.includes(primary) ? primary : 'de';
    } else {
      req.locale = 'de';
    }
    next();
  }
}
