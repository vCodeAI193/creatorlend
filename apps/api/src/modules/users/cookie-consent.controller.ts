import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { CookieConsentService } from "./cookie-consent.service";

@Controller("cookie-consent")
export class CookieConsentController {
  constructor(private readonly svc: CookieConsentService) {}

  @Post()
  setConsent(@Body() body: { sessionId?: string; analytics: boolean; marketing: boolean; functional: boolean }, @Req() req: any) {
    return this.svc.setConsent(body.sessionId ?? "", body.analytics, body.marketing, body.functional, req.userId, req.ip);
  }

  @Get()
  getConsent(@Query("sessionId") sessionId: string, @Req() req: any) {
    return this.svc.getConsent(req.userId, sessionId);
  }
}
