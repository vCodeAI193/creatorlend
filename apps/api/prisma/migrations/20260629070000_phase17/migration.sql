-- Phase 17: Payout features, admin panel, notifications, artist tools, subscription flows, faceted search

-- AlterTable User (only add columns that don't exist yet)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='currency') THEN
    ALTER TABLE "User" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='payoutThreshold') THEN
    ALTER TABLE "User" ADD COLUMN "payoutThreshold" INTEGER NOT NULL DEFAULT 1000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='suspendedAt') THEN
    ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='suspendReason') THEN
    ALTER TABLE "User" ADD COLUMN "suspendReason" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='fcmToken') THEN
    ALTER TABLE "User" ADD COLUMN "fcmToken" TEXT;
  END IF;
END $$;

-- AlterTable Work (only add columns that don't exist yet)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Work' AND column_name='promoPrice') THEN
    ALTER TABLE "Work" ADD COLUMN "promoPrice" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Work' AND column_name='promoEndsAt') THEN
    ALTER TABLE "Work" ADD COLUMN "promoEndsAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Work' AND column_name='viewCount') THEN
    ALTER TABLE "Work" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Work' AND column_name='earningsGoalCents') THEN
    ALTER TABLE "Work" ADD COLUMN "earningsGoalCents" INTEGER;
  END IF;
END $$;

-- CreateTable Announcement
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_active_idx" ON "Announcement"("active");
