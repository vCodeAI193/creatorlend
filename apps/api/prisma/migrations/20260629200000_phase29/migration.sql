-- Phase 29: NPS surveys, custom event tracking, outgoing webhook deliveries

-- F-809: NPS-Umfrage
CREATE TABLE IF NOT EXISTS "NpsSurvey" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "score"     INTEGER NOT NULL,
  "comment"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NpsSurvey_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NpsSurvey_userId_idx" ON "NpsSurvey"("userId");
CREATE INDEX IF NOT EXISTS "NpsSurvey_createdAt_idx" ON "NpsSurvey"("createdAt");
ALTER TABLE "NpsSurvey" DROP CONSTRAINT IF EXISTS "NpsSurvey_userId_fkey";
ALTER TABLE "NpsSurvey" ADD CONSTRAINT "NpsSurvey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- F-800: Custom Event Tracking
CREATE TABLE IF NOT EXISTS "CustomEvent" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"     TEXT,
  "eventName"  TEXT NOT NULL,
  "properties" JSONB,
  "sessionId"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomEvent_eventName_idx" ON "CustomEvent"("eventName");
CREATE INDEX IF NOT EXISTS "CustomEvent_userId_idx" ON "CustomEvent"("userId");
CREATE INDEX IF NOT EXISTS "CustomEvent_createdAt_idx" ON "CustomEvent"("createdAt");

-- F-883/884/885: Outgoing Webhook Deliveries
CREATE TABLE IF NOT EXISTS "OutgoingWebhookDelivery" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "subscriptionId" TEXT NOT NULL,
  "event"          TEXT NOT NULL,
  "payload"        JSONB NOT NULL,
  "signature"      TEXT,
  "statusCode"     INTEGER,
  "attempts"       INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt"    TIMESTAMP(3),
  "succeededAt"    TIMESTAMP(3),
  "errorMessage"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutgoingWebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OutgoingWebhookDelivery_subscriptionId_idx" ON "OutgoingWebhookDelivery"("subscriptionId");
CREATE INDEX IF NOT EXISTS "OutgoingWebhookDelivery_nextRetryAt_idx" ON "OutgoingWebhookDelivery"("nextRetryAt");
CREATE INDEX IF NOT EXISTS "OutgoingWebhookDelivery_event_idx" ON "OutgoingWebhookDelivery"("event");
