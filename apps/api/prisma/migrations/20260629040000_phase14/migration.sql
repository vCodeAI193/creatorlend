-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "SingleLoanPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripePiId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SingleLoanPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanAddon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "extraLoans" INTEGER NOT NULL DEFAULT 5,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanAddon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SingleLoanPurchase_stripePiId_key" ON "SingleLoanPurchase"("stripePiId");

-- CreateIndex
CREATE UNIQUE INDEX "SingleLoanPurchase_loanId_key" ON "SingleLoanPurchase"("loanId");

-- CreateIndex
CREATE INDEX "SingleLoanPurchase_userId_idx" ON "SingleLoanPurchase"("userId");

-- CreateIndex
CREATE INDEX "SingleLoanPurchase_workId_idx" ON "SingleLoanPurchase"("workId");

-- CreateIndex
CREATE INDEX "LoanAddon_userId_idx" ON "LoanAddon"("userId");

-- AddForeignKey
ALTER TABLE "SingleLoanPurchase" ADD CONSTRAINT "SingleLoanPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleLoanPurchase" ADD CONSTRAINT "SingleLoanPurchase_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAddon" ADD CONSTRAINT "LoanAddon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

