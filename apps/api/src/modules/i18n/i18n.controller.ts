import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { I18nService, SUPPORTED_LOCALES, SupportedLocale } from './i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18n: I18nService) {}

  // GET /api/v1/i18n/locales – verfügbare Sprachen (F-990)
  @Get('locales')
  listLocales() {
    return this.i18n.listLocales();
  }

  // GET /api/v1/i18n/translations/:locale – alle Übersetzungen laden (F-989)
  @Get('translations/:locale')
  getTranslations(@Param('locale') locale: string) {
    const safe = SUPPORTED_LOCALES.includes(locale as SupportedLocale) ? (locale as SupportedLocale) : 'de';
    return this.i18n.getTranslations(safe);
  }

  // GET /api/v1/i18n/detect – Sprache aus Accept-Language ermitteln (F-991)
  @Get('detect')
  detectLocale(@Headers('accept-language') acceptLanguage?: string) {
    return { locale: this.i18n.detectLocale(acceptLanguage) };
  }

  // GET /api/v1/i18n/tms – Translation Management System Status (F-996)
  @Get('tms')
  tmsStatus() {
    return this.i18n.getTmsStatus();
  }

  // GET /api/v1/i18n/format?amount=1234&locale=de – Währungsformat (F-993)
  @Get('format')
  formatCurrency(
    @Query('amount') amount: string,
    @Query('locale') locale: string,
    @Query('currency') currency?: string,
  ) {
    const safe = SUPPORTED_LOCALES.includes(locale as SupportedLocale) ? (locale as SupportedLocale) : 'de';
    return { formatted: this.i18n.formatCurrency(Number(amount), safe, currency) };
  }
}
