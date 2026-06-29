-- Phase 26: fraud score, admin tags, notification archive

-- F-738: Betrugs-Score pro Nutzer:in
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fraudScore" INTEGER NOT NULL DEFAULT 0;

-- F-717: Admin-Tags (VIP, At-Risk, Flagged)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminTags" TEXT[] NOT NULL DEFAULT '{}';

-- F-673: Benachrichtigungen archivieren
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Notification_userId_archivedAt_idx" ON "Notification"("userId", "archivedAt");
