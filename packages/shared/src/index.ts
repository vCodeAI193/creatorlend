/**
 * Geteilte Domänentypen und Konstanten für CreatorLend.
 * Werden sowohl von der Web-App als auch von der API genutzt.
 */

export const DEFAULT_LOAN_DURATION_DAYS = 7;

export enum UserRole {
  LISTENER = "LISTENER",
  ARTIST = "ARTIST",
}

export enum WorkType {
  MUSIC = "MUSIC",
  PODCAST = "PODCAST",
  AUDIOBOOK = "AUDIOBOOK",
  SKETCH = "SKETCH",
}

export enum WorkStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

export enum LoanStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  EXCHANGED = "EXCHANGED",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
}

export enum PayoutItemStatus {
  PENDING = "PENDING",
  PAID = "PAID",
}

export enum SubscriptionPlan {
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
}

export interface Work {
  id: string;
  artistId: string;
  title: string;
  type: WorkType;
  description?: string;
  loanPriceCents: number;
  durationSeconds?: number;
  language?: string;
  status: WorkStatus;
}

export interface Loan {
  id: string;
  userId: string;
  workId: string;
  status: LoanStatus;
  startedAt: string;
  expiresAt: string;
  renewalCount: number;
}

export interface PayoutItem {
  id: string;
  artistId: string;
  loanId: string;
  amountCents: number;
  status: PayoutItemStatus;
  createdAt: string;
}
