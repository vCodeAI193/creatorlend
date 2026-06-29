-- AlterTable: User – referral, quiet hours, notification digest
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "notifDigestMode" TEXT,
ADD COLUMN     "quietHoursEnd" INTEGER,
ADD COLUMN     "quietHoursStart" INTEGER;

-- AlterTable: Work – extended metadata
ALTER TABLE "Work" ADD COLUMN     "ageRating" TEXT,
ADD COLUMN     "availableUntil" TIMESTAMP(3),
ADD COLUMN     "coArtists" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "contentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "geoBlocked" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isExclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "isrcCode" TEXT,
ADD COLUMN     "licenseType" TEXT;

-- CreateTable: UserBadge (F-065)
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdminNote (F-716)
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Bookmark (F-124)
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "positionSeconds" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkNote (F-126)
CREATE TABLE "WorkNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InviteCode (F-062)
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "bonusLoans" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SubscriptionPause (F-346)
CREATE TABLE "SubscriptionPause" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumeAt" TIMESTAMP(3) NOT NULL,
    "resumedAt" TIMESTAMP(3),
    CONSTRAINT "SubscriptionPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Tip (F-323)
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "workId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Milestone (F-469)
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE UNIQUE INDEX "UserBadge_userId_type_key" ON "UserBadge"("userId", "type");
CREATE INDEX "AdminNote_userId_idx" ON "AdminNote"("userId");
CREATE INDEX "Bookmark_userId_workId_idx" ON "Bookmark"("userId", "workId");
CREATE INDEX "WorkNote_userId_idx" ON "WorkNote"("userId");
CREATE UNIQUE INDEX "WorkNote_userId_workId_key" ON "WorkNote"("userId", "workId");
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE INDEX "InviteCode_creatorId_idx" ON "InviteCode"("creatorId");
CREATE UNIQUE INDEX "SubscriptionPause_userId_key" ON "SubscriptionPause"("userId");
CREATE INDEX "SubscriptionPause_resumeAt_idx" ON "SubscriptionPause"("resumeAt");
CREATE INDEX "Tip_artistId_idx" ON "Tip"("artistId");
CREATE INDEX "Tip_senderId_idx" ON "Tip"("senderId");
CREATE INDEX "Milestone_userId_idx" ON "Milestone"("userId");
CREATE UNIQUE INDEX "Milestone_userId_type_key" ON "Milestone"("userId", "type");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkNote" ADD CONSTRAINT "WorkNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkNote" ADD CONSTRAINT "WorkNote_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

