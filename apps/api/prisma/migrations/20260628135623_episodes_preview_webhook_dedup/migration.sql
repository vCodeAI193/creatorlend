-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "previewKey" TEXT;

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationSeconds" INTEGER,
    "mediaKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Episode_workId_idx" ON "Episode"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_workId_number_key" ON "Episode"("workId", "number");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent"("processedAt");

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
