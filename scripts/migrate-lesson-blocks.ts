/**
 * CLI helper: dry-run or apply legacy lesson content → ContentBlock migration.
 * Usage:
 *   npx tsx scripts/migrate-lesson-blocks.ts --dry-run
 *   npx tsx scripts/migrate-lesson-blocks.ts --apply
 *
 * Prefer the admin UI "Migrar agora" button (runs with requireAdmin).
 * This script is for ops/backup windows and requires DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(dryRun ? "DRY-RUN mode" : "APPLY mode");

  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      objective: true,
      context: true,
      tipText: true,
      blocksMigrated: true,
      _count: { select: { blocks: true, checklistItems: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Lessons scanned: ${lessons.length}`);
  console.log(`Already migrated: ${lessons.filter((l) => l.blocksMigrated).length}`);
  console.log(
    `With legacy fields: ${
      lessons.filter((l) => l.objective || l.context || l.tipText).length
    }`
  );

  if (dryRun) {
    console.log("\nRe-run with --apply from the admin panel (recommended) or after reviewing.");
    console.log("This CLI does not perform writes without the in-app admin action.");
    return;
  }

  console.log("Use the admin panel migrate action (requireAdmin + audited path).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
