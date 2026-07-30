DO $$ BEGIN
  CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BannerTargetType" AS ENUM ('CATEGORY', 'MODULE', 'URL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Banner" (
  "id" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "title" TEXT,
  "subtitle" TEXT,
  "order" INTEGER NOT NULL,
  "status" "BannerStatus" NOT NULL DEFAULT 'ACTIVE',
  "targetType" "BannerTargetType",
  "targetId" TEXT,
  "targetUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Banner_order_key" ON "Banner"("order");
CREATE INDEX IF NOT EXISTS "Banner_status_order_idx" ON "Banner"("status", "order");

INSERT INTO "Banner" ("id", "imageUrl", "title", "subtitle", "order", "status", "createdAt", "updatedAt")
SELECT
  'initial-course-banner',
  "bannerUrl",
  "title",
  "description",
  1,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Course"
WHERE "bannerUrl" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Banner");
