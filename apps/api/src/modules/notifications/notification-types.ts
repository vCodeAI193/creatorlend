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
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
