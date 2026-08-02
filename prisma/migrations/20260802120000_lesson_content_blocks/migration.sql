-- Expand content block types for the visual lesson builder.
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'HEADING';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'SUBHEADING';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'CHECKLIST';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'CHECKBOX';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'INFO';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'EXAMPLE';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'BULLET_LIST';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'NUMBERED_LIST';
ALTER TYPE "ContentBlockType" ADD VALUE IF NOT EXISTS 'DIVIDER';

-- Lesson document options + migration flag (legacy columns preserved).
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "showAutoTitle" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "blocksMigrated" BOOLEAN NOT NULL DEFAULT false;

-- Block visibility + typed settings JSON.
ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "settings" TEXT;

-- Allow empty content (dividers).
ALTER TABLE "ContentBlock" ALTER COLUMN "content" SET DEFAULT '';

CREATE INDEX IF NOT EXISTS "ContentBlock_lessonId_isVisible_order_idx" ON "ContentBlock"("lessonId", "isVisible", "order");
