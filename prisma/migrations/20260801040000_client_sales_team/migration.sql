-- Safe additive migration: client commercial fields, access statuses, team invites.
-- No DROP TABLE / DROP COLUMN.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SELLER';

ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

DO $$ BEGIN
  CREATE TYPE "CommercialStage" AS ENUM (
    'NEW_LEAD',
    'CONTACT_MADE',
    'AWAITING_PAYMENT',
    'PAYMENT_CONFIRMED',
    'AWAITING_REGISTRATION',
    'AWAITING_APPROVAL',
    'SALE_COMPLETED',
    'SALE_LOST'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TeamInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "commercialStage" "CommercialStage" NOT NULL DEFAULT 'NEW_LEAD',
  ADD COLUMN IF NOT EXISTS "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "blockReason" TEXT,
  ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

UPDATE "UserProfile"
SET "commercialStage" = CASE
  WHEN "status" = 'ACTIVE' THEN 'SALE_COMPLETED'::"CommercialStage"
  WHEN "status" = 'REFUSED' THEN 'SALE_LOST'::"CommercialStage"
  ELSE 'NEW_LEAD'::"CommercialStage"
END
WHERE "role" = 'STUDENT';

CREATE TABLE IF NOT EXISTS "TeamInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "TeamInviteStatus" NOT NULL DEFAULT 'PENDING',
  "clerkInvitationId" TEXT,
  "invitedById" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_clerkInvitationId_key" ON "TeamInvite"("clerkInvitationId");
CREATE INDEX IF NOT EXISTS "TeamInvite_email_status_idx" ON "TeamInvite"("email", "status");
CREATE INDEX IF NOT EXISTS "TeamInvite_role_status_idx" ON "TeamInvite"("role", "status");
CREATE INDEX IF NOT EXISTS "UserProfile_commercialStage_status_idx" ON "UserProfile"("commercialStage", "status");
CREATE INDEX IF NOT EXISTS "UserProfile_role_commercialStage_idx" ON "UserProfile"("role", "commercialStage");

DO $$ BEGIN
  ALTER TABLE "TeamInvite"
    ADD CONSTRAINT "TeamInvite_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;