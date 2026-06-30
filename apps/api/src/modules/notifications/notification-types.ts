/** Bekannte Benachrichtigungstypen (F-082..F-084, B-126). */
export const NotificationType = {
  LOAN_CREATED: "LOAN_CREATED",          // an Künstler:in: neues Werk geliehen
  LOAN_EXPIRING: "LOAN_EXPIRING",        // an Hörer:in: Leihe läuft bald ab (24h)
  LOAN_EXPIRING_48H: "LOAN_EXPIRING_48H", // an Hörer:in: Leihe läuft in 48h ab (F-262)
  LOAN_EXPIRED: "LOAN_EXPIRED",          // an Hörer:in: Leihe abgelaufen
  PAYOUT_PAID: "PAYOUT_PAID",            // an Künstler:in: Auszahlung erfolgt
  NEW_WORK: "NEW_WORK",                  // an Follower:innen: neues Werk von gefolgter Künstler:in (B-126)
  SUBSCRIPTION_RENEWAL: "SUBSCRIPTION_RENEWAL", // an Hörer:in: Abo verlängert sich in 7 Tagen (F-418)
  LOAN_GIFT_RECEIVED: "LOAN_GIFT_RECEIVED", // an Empfänger:in: Leihe als Geschenk erhalten (F-259)
  NEW_FOLLOWER: "NEW_FOLLOWER",             // an Künstler:in: neuer Follower (F-610)
  REVIEW_CREATED: "REVIEW_CREATED",         // an Künstler:in: neue Bewertung (F-493)
  WORK_CURATED: "WORK_CURATED",             // an Künstler:in: Werk kuratiert (F-680)
  MILESTONE_REACHED: "MILESTONE_REACHED",   // an Künstler:in: Meilenstein erreicht (F-681)
  PAYOUT_FLAGGED: "PAYOUT_FLAGGED",         // an Admin: Betrug-Verdacht bei Auszahlung (F-391)
  RE_ENGAGEMENT: "RE_ENGAGEMENT",           // an Hörer:in: Inaktivitätserinnerung (F-655)
  WINBACK_CAMPAIGN: "WINBACK_CAMPAIGN",     // an Hörer:in: Winback nach Abo-Kündigung (F-656)
  POST_LOAN_SURVEY: "POST_LOAN_SURVEY",     // an Hörer:in: Post-Leihe Umfrage (F-657)
  BIRTHDAY_DISCOUNT: "BIRTHDAY_DISCOUNT",  // an Nutzer:in: Geburtstags-Rabatt (F-658)
  ANNIVERSARY: "ANNIVERSARY",              // an Nutzer:in: Jubiläum (F-659)
  WELCOME_SERIES: "WELCOME_SERIES",        // an neue Nutzer:innen: Willkommensserie (F-660)
  ONBOARDING_CHECKLIST: "ONBOARDING_CHECKLIST", // an Künstler:in: Onboarding-Checkliste (F-661)
  REVIEW_COMMENT: "REVIEW_COMMENT",        // an Nutzer:in: neuer Kommentar auf Rezension (F-679)
  PRICE_CHANGE_FAVORITE: "PRICE_CHANGE_FAVORITE", // an Hörer:in: Preisänderung Favorit (F-682)
  PROMO_CODE_EXPIRING: "PROMO_CODE_EXPIRING", // an Nutzer:in: Promo-Code läuft ab (F-683)
  FRIEND_RECOMMENDATION: "FRIEND_RECOMMENDATION", // an Nutzer:in: von Freund:in empfohlen (F-684)
  NEW_CHAPTER: "NEW_CHAPTER",              // an Hörer:in: neues Kapitel verfügbar (F-685)
  REVIEW_UPVOTED: "REVIEW_UPVOTED",        // an Nutzer:in: Bewertung upvoted (F-686)
  BOOK_CLUB_STARTING: "BOOK_CLUB_STARTING", // an Mitglied: Buchclub beginnt in 1h (F-687)
  PRICE_DROP_WISHLIST: "PRICE_DROP_WISHLIST", // an Hörer:in: Preissenkung Wunschliste (F-688)
  ARTIST_ON_SALE: "ARTIST_ON_SALE",        // an Hörer:in: Lieblingsartist im Angebot (F-689)
  RATING_PROMPT: "RATING_PROMPT",          // an Hörer:in: Bewertungsaufforderung nach Ablauf (F-519)
  RATING_PROMPT_24H: "RATING_PROMPT_24H",  // an Hörer:in: 24h-Bewertungserinnerung (F-520)
  ARTIST_NEWSLETTER: "ARTIST_NEWSLETTER",  // an Follower:in: Künstler-Newsletter (F-443)
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
