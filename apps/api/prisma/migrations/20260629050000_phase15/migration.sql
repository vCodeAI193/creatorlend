-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "excludedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferredTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "wishlistPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wishlistSlug" TEXT;

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "earlyAccessDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LoanDevice" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanGift" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "LoanGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanDevice_loanId_idx" ON "LoanDevice"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanDevice_loanId_deviceId_key" ON "LoanDevice"("loanId", "deviceId");

-- CreateIndex
CREATE INDEX "LoanGift_senderId_idx" ON "LoanGift"("senderId");

-- CreateIndex
CREATE INDEX "LoanGift_recipientId_idx" ON "LoanGift"("recipientId");

-- CreateIndex
CREATE INDEX "LoanReservation_userId_idx" ON "LoanReservation"("userId");

-- CreateIndex
CREATE INDEX "LoanReservation_scheduledAt_idx" ON "LoanReservation"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_wishlistSlug_key" ON "User"("wishlistSlug");

-- AddForeignKey
ALTER TABLE "LoanDevice" ADD CONSTRAINT "LoanDevice_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanGift" ADD CONSTRAINT "LoanGift_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanGift" ADD CONSTRAINT "LoanGift_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanGift" ADD CONSTRAINT "LoanGift_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanReservation" ADD CONSTRAINT "LoanReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanReservation" ADD CONSTRAINT "LoanReservation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

