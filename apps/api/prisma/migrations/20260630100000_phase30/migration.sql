-- Phase 30: Feature Flags, UTM Tracking, Cookie Consent, Offline Actions

-- Feature-Flag (F-743/F-970)
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "key"        TEXT NOT NULL,
  "enabled"    BOOLEAN NOT NULL DEFAULT false,
  "rollout"    INTEGER NOT NULL DEFAULT 100,
  "conditions" JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX IF NOT EXISTS "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- UTM-Event-Tracking (F-801/F-802)
CREATE TABLE IF NOT EXISTS "UtmEvent" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT,
  "sessionId" TEXT,
  "source"    TEXT,
  "medium"    TEXT,
  "campaign"  TEXT,
  "content"   TEXT,
  "term"      TEXT,
  "page"      TEXT,
  "referrer"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UtmEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UtmEvent_userId_idx" ON "UtmEvent"("userId");
CREATE INDEX IF NOT EXISTS "UtmEvent_campaign_idx" ON "UtmEvent"("campaign");
CREATE INDEX IF NOT EXISTS "UtmEvent_createdAt_idx" ON "UtmEvent"("createdAt");

-- Cookie-Consent (F-947)
CREATE TABLE IF NOT EXISTS "CookieConsent" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT,
  "sessionId"   TEXT,
  "preferences" JSONB NOT NULL,
  "ipHash"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CookieConsent_userId_idx" ON "CookieConsent"("userId");
CREATE INDEX IF NOT EXISTS "CookieConsent_sessionId_idx" ON "CookieConsent"("sessionId");

-- Offline-Action-Queue (F-827)
CREATE TABLE IF NOT EXISTS "OfflineAction" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "action"      JSONB NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "processedAt" TIMESTAMP(3),
  "error"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfflineAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfflineAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);
CREATE INDEX IF NOT EXISTS "OfflineAction_userId_idx" ON "OfflineAction"("userId");
CREATE INDEX IF NOT EXISTS "OfflineAction_status_idx" ON "OfflineAction"("status");
