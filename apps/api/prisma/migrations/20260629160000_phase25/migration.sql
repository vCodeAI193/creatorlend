-- Phase 25: private listening mode, fraud flag, report assignment/status tracking

-- F-318: Private listening mode
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privateListeningMode" BOOLEAN NOT NULL DEFAULT false;

-- F-391: Fraud flag for payout items
ALTER TABLE "PayoutItem" ADD COLUMN IF NOT EXISTS "flaggedForFraud" BOOLEAN NOT NULL DEFAULT false;

-- F-721/722: Report assignment and status tracking
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
CREATE INDEX IF NOT EXISTS "Report_assigneeId_idx" ON "Report"("assigneeId");
