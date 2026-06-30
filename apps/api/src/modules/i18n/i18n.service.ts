import { Injectable } from '@nestjs/common';

export const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'es'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// Minimal translation catalog – populated by CMS/Crowdin in production (F-996)
const TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  de: {
    'error.not_found': 'Nicht gefunden',
    'error.unauthorized': 'Nicht autorisiert',
    'error.forbidden': 'Zugriff verweigert',
    'loan.active': 'Aktive Leihe',
    'loan.expired': 'Abgelaufene Leihe',
    'subscription.active': 'Aktives Abo',
    'subscription.canceled': 'Abonnement gekündigt',
  },
  en: {
    'error.not_found': 'Not found',
    'error.unauthorized': 'Unauthorized',
    'error.forbidden': 'Forbidden',
    'loan.active': 'Active loan',
    'loan.expired': 'Expired loan',
    'subscription.active': 'Active subscription',
    'subscription.canceled': 'Subscription canceled',
  },
  fr: {
    'error.not_found': 'Introuvable',
    'error.unauthorized': 'Non autorisé',
    'error.forbidden': 'Accès refusé',
    'loan.active': 'Emprunt actif',
    'loan.expired': 'Emprunt expiré',
    'subscription.active': 'Abonnement actif',
    'subscription.canceled': 'Abonnement annulé',
  },
  es: {
    'error.not_found': 'No encontrado',
    'error.unauthorized': 'No autorizado',
    'error.forbidden': 'Acceso denegado',
    'loan.active': 'Préstamo activo',
    'loan.expired': 'Préstamo vencido',
    'subscription.active': 'Suscripción activa',
    'subscription.canceled': 'Suscripción cancelada',
  },
};

@Injectable()
export class I18nService {
  // F-991: Spracherkennung aus Accept-Language-Header
  detectLocale(acceptLanguage?: string): SupportedLocale {
    if (!acceptLanguage) return 'de';
    const preferred = acceptLanguage
      .split(',')
      .map((l) => l.split(';')[0].trim().substring(0, 2).toLowerCase());
    for (const lang of preferred) {
      if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
        return lang as SupportedLocale;
      }
    }
    return 'de';
  }

  // F-989: ICU-Messageformat-Übersetzung
  translate(key: string, locale: SupportedLocale, params?: Record<string, string>): string {
    const catalog = TRANSLATIONS[locale] ?? TRANSLATIONS['de'];
    let text = catalog[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return text;
  }

  // F-990: Alle Übersetzungen einer Sprache
  getTranslations(locale: SupportedLocale): Record<string, string> {
    return TRANSLATIONS[locale] ?? TRANSLATIONS['de'];
  }

  // F-993: Währungsformat je Locale
  formatCurrency(cents: number, locale: SupportedLocale, currency = 'EUR'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // F-994: Datumsformat je Locale
  formatDate(date: Date, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US').format(date);
  }

  // F-995: Plural-Regeln
  plural(locale: SupportedLocale, count: number, one: string, other: string): string {
    const rules = new Intl.PluralRules(locale);
    return rules.select(count) === 'one' ? one : other;
  }

  listLocales() {
    return SUPPORTED_LOCALES.map((code) => ({
      code,
      name: { de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español' }[code],
    }));
  }

  // F-996: Translation Management System (Crowdin/Phrase stub)
  getTmsStatus() {
    return {
      provider: process.env.TMS_PROVIDER ?? 'crowdin',
      projectId: process.env.CROWDIN_PROJECT_ID ?? null,
      locales: SUPPORTED_LOCALES,
      translationProgress: {
        de: 100,
        en: 100,
        fr: 78,
        es: 65,
      },
      lastSync: null,
      syncUrl: 'https://crowdin.com/project/creatorlend',
    };
  }
}
