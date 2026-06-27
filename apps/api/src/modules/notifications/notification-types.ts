/** Bekannte Benachrichtigungstypen (F-082..F-084). */
export const NotificationType = {
  LOAN_CREATED: "LOAN_CREATED", // an Künstler:in: neues Werk geliehen
  LOAN_EXPIRING: "LOAN_EXPIRING", // an Hörer:in: Leihe läuft bald ab
  LOAN_EXPIRED: "LOAN_EXPIRED", // an Hörer:in: Leihe abgelaufen
  PAYOUT_PAID: "PAYOUT_PAID", // an Künstler:in: Auszahlung erfolgt
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
