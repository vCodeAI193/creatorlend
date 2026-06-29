/** Bekannte Benachrichtigungstypen (F-082..F-084, B-126). */
export const NotificationType = {
  LOAN_CREATED: "LOAN_CREATED",   // an Künstler:in: neues Werk geliehen
  LOAN_EXPIRING: "LOAN_EXPIRING", // an Hörer:in: Leihe läuft bald ab
  LOAN_EXPIRED: "LOAN_EXPIRED",   // an Hörer:in: Leihe abgelaufen
  PAYOUT_PAID: "PAYOUT_PAID",     // an Künstler:in: Auszahlung erfolgt
  NEW_WORK: "NEW_WORK",           // an Follower:innen: neues Werk von gefolgter Künstler:in (B-126)
  SUBSCRIPTION_RENEWAL: "SUBSCRIPTION_RENEWAL", // an Hörer:in: Abo verlängert sich in 7 Tagen (F-418)
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
