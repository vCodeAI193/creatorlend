-- Phase 27: Notification pin, support tickets, new notification types

-- F-675: Pin notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);

-- F-693/694/700: Support ticket system
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "subject"     TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'OPEN',
  "priority"    TEXT NOT NULL DEFAULT 'NORMAL',
  "assigneeId"  TEXT,
  "slaDeadline" TIMESTAMP(3),
  "resolvedAt"  TIMESTAMP(3),
  "csatScore"   INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_assigneeId_idx" ON "SupportTicket"("assigneeId");

ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_userId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
