-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "coverKey" TEXT,
ADD COLUMN     "publishAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChapterMark" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "episodeId" TEXT,
    "title" TEXT NOT NULL,
    "positionSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterMark_workId_idx" ON "ChapterMark"("workId");

-- CreateIndex
CREATE INDEX "ChapterMark_episodeId_idx" ON "ChapterMark"("episodeId");

-- CreateIndex
CREATE INDEX "Work_status_publishAt_idx" ON "Work"("status", "publishAt");

-- CreateIndex
CREATE INDEX "Work_status_createdAt_idx" ON "Work"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Work_status_loanPriceCents_idx" ON "Work"("status", "loanPriceCents");

-- AddForeignKey
ALTER TABLE "ChapterMark" ADD CONSTRAINT "ChapterMark_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
