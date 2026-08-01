-- Additive migration: seller association, soft delete, sales ledger, audit log.
-- No DROP TABLE / DROP COLUMN / destructive changes.

DO $$ BEGIN
  CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "sellerId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE INDEX IF NOT EXISTS "UserProfile_sellerId_idx" ON "UserProfile"("sellerId");
CREATE INDEX IF NOT EXISTS "UserProfile_deletedAt_idx" ON "UserProfile"("deletedAt");

DO $$ BEGIN
  ALTER TABLE "UserProfile"
    ADD CONSTRAINT "UserProfile_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Sale" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "sellerId" TEXT,
  "amountInCents" INTEGER NOT NULL,
  "status" "SaleStatus" NOT NULL DEFAULT 'CONFIRMED',
  "soldAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Sale_clientId_idx" ON "Sale"("clientId");
CREATE INDEX IF NOT EXISTS "Sale_sellerId_idx" ON "Sale"("sellerId");
CREATE INDEX IF NOT EXISTS "Sale_soldAt_idx" ON "Sale"("soldAt");
CREATE INDEX IF NOT EXISTS "Sale_status_soldAt_idx" ON "Sale"("status", "soldAt");

DO $$ BEGIN
  ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_createdByAdminId_fkey"
    FOREIGN KEY ("createdByAdminId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "result" TEXT NOT NULL,
  "meta" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

DO $$ BEGIN
  ALTER TABLE "AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
