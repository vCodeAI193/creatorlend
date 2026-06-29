-- Phase 20: Add encryptedBody to DirectMessage (F-940)

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "encryptedBody" TEXT;
