import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocaleService } from './locale.service';

const SUPPORTED_LANGUAGES = ['de', 'en', 'fr', 'es'];
const TRANSLATIONS: Record<string, Record<string, string>> = {
  de: { 'app.name': 'CreatorLend', 'loan.borrow': 'Leihen', 'loan.return': 'Zurückgeben' },
  en: { 'app.name': 'CreatorLend', 'loan.borrow': 'Borrow', 'loan.return': 'Return' },
  fr: { 'app.name': 'CreatorLend', 'loan.borrow': 'Emprunter', 'loan.return': 'Retourner' },
  es: { 'app.name': 'CreatorLend', 'loan.borrow': 'Tomar prestado', 'loan.return': 'Devolver' },
};

@Controller('i18n')
export class I18nController {
  constructor(private readonly locale: LocaleService) {}

  @Get('languages')
  languages() { return { supported: SUPPORTED_LANGUAGES }; }

  // GET /api/v1/i18n/format/currency?cents=1234&locale=de-DE (F-993/F-994)
  @Get('format/currency')
  formatCurrency(
    @Query('cents') cents: string,
    @Query('locale') locale = 'de-DE',
    @Query('currency') currency = 'EUR',
  ) {
    return { formatted: this.locale.formatCurrency(Number(cents), locale, currency) };
  }

  @Get(':lang')
  translations(@Param('lang') lang: string) {
    return TRANSLATIONS[lang] ?? TRANSLATIONS.de;
  }
}
