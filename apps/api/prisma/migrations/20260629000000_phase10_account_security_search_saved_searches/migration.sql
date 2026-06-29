-- AlterTable: User – account lockout, soft-delete, T&C versioning, analytics opt-out (F-012/024/047/076)
ALTER TABLE "User" ADD COLUMN     "analyticsOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable: Work – archived state
ALTER TABLE "Work" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateTable: EmailChangeRequest (F-020)
CREATE TABLE "EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SavedSearch (F-199)
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Series
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SeriesItem
CREATE TABLE "SeriesItem" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeriesItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Transcript
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "format" TEXT NOT NULL DEFAULT 'TXT',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArtistPost
CREATE TABLE "ArtistPost" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArtistPostReaction
CREATE TABLE "ArtistPostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '👍',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistPostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArtistPostComment
CREATE TABLE "ArtistPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DirectMessage
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Block
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkVersion
CREATE TABLE "WorkVersion" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeRequest_tokenHash_key" ON "EmailChangeRequest"("tokenHash");
CREATE INDEX "EmailChangeRequest_userId_idx" ON "EmailChangeRequest"("userId");
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");
CREATE INDEX "Series_artistId_idx" ON "Series"("artistId");
CREATE INDEX "SeriesItem_seriesId_idx" ON "SeriesItem"("seriesId");
CREATE UNIQUE INDEX "SeriesItem_seriesId_workId_key" ON "SeriesItem"("seriesId", "workId");
CREATE INDEX "Transcript_workId_idx" ON "Transcript"("workId");
CREATE UNIQUE INDEX "Transcript_workId_language_key" ON "Transcript"("workId", "language");
CREATE INDEX "ArtistPost_artistId_idx" ON "ArtistPost"("artistId");
CREATE INDEX "ArtistPost_publishedAt_idx" ON "ArtistPost"("publishedAt");
CREATE INDEX "ArtistPostReaction_postId_idx" ON "ArtistPostReaction"("postId");
CREATE UNIQUE INDEX "ArtistPostReaction_postId_userId_key" ON "ArtistPostReaction"("postId", "userId");
CREATE INDEX "ArtistPostComment_postId_idx" ON "ArtistPostComment"("postId");
CREATE INDEX "DirectMessage_senderId_recipientId_idx" ON "DirectMessage"("senderId", "recipientId");
CREATE INDEX "DirectMessage_recipientId_idx" ON "DirectMessage"("recipientId");
CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId");
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");
CREATE INDEX "WorkVersion_workId_idx" ON "WorkVersion"("workId");

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Series" ADD CONSTRAINT "Series_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeriesItem" ADD CONSTRAINT "SeriesItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeriesItem" ADD CONSTRAINT "SeriesItem_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArtistPost" ADD CONSTRAINT "ArtistPost_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArtistPostReaction" ADD CONSTRAINT "ArtistPostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ArtistPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistPostComment" ADD CONSTRAINT "ArtistPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ArtistPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistPostComment" ADD CONSTRAINT "ArtistPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkVersion" ADD CONSTRAINT "WorkVersion_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
