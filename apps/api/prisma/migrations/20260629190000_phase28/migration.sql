-- Phase 28: Strike system, warnings, appeals, GDPR requests, report escalation

-- F-732: Strike count on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "strikeCount" INTEGER NOT NULL DEFAULT 0;

-- F-724: Escalation level on Report
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "escalationLevel" INTEGER NOT NULL DEFAULT 0;

-- F-733: User warnings
CREATE TABLE IF NOT EXISTS "UserWarning" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "reason"    TEXT NOT NULL,
  "deadline"  TIMESTAMP(3),
  "adminId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserWarning_userId_idx" ON "UserWarning"("userId");
ALTER TABLE "UserWarning" DROP CONSTRAINT IF EXISTS "UserWarning_userId_fkey";
ALTER TABLE "UserWarning" ADD CONSTRAINT "UserWarning_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- F-734: Appeal requests
CREATE TABLE IF NOT EXISTS "AppealRequest" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "reason"    TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppealRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AppealRequest_userId_idx" ON "AppealRequest"("userId");
CREATE INDEX IF NOT EXISTS "AppealRequest_status_idx" ON "AppealRequest"("status");
ALTER TABLE "AppealRequest" DROP CONSTRAINT IF EXISTS "AppealRequest_userId_fkey";
ALTER TABLE "AppealRequest" ADD CONSTRAINT "AppealRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- F-747/748: GDPR data requests
CREATE TABLE IF NOT EXISTS "GdprDataRequest" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "adminId"     TEXT,
  "downloadUrl" TEXT,
  CONSTRAINT "GdprDataRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GdprDataRequest_userId_idx" ON "GdprDataRequest"("userId");
CREATE INDEX IF NOT EXISTS "GdprDataRequest_status_idx" ON "GdprDataRequest"("status");
ALTER TABLE "GdprDataRequest" DROP CONSTRAINT IF EXISTS "GdprDataRequest_userId_fkey";
ALTER TABLE "GdprDataRequest" ADD CONSTRAINT "GdprDataRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
