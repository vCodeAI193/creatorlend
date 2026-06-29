import { Injectable } from '@nestjs/common';

@Injectable()
export class LocaleService {
  formatCurrency(cents: number, locale = 'de-DE', currency = 'EUR') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  }

  formatDate(date: Date | string, locale = 'de-DE') {
    return new Intl.DateTimeFormat(locale).format(new Date(date));
  }

  pluralize(count: number, locale = 'de-DE', noun = 'Werk') {
    const pr = new Intl.PluralRules(locale);
    const rule = pr.select(count);
    const forms: Record<string, string> = { one: noun, other: `${noun}e` };
    return `${count} ${forms[rule] ?? noun}`;
  }
}
