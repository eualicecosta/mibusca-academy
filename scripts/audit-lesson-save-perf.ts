/**
 * Offline / DB-side audit of the lesson save query pattern (prompt27).
 *
 * Does NOT call Clerk/R2/revalidate. Measures the Prisma operations that dominate
 * saveLessonDocument for a real lesson with N blocks.
 *
 * Usage:
 *   npx tsx scripts/audit-lesson-save-perf.ts
 *   npx tsx scripts/audit-lesson-save-perf.ts --lessonId=<id> --runs=5
 *
 * No lesson content is printed.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const lessonId = args.find((a) => a.startsWith("--lessonId="))?.split("=")[1];
  const runs = Number(args.find((a) => a.startsWith("--runs="))?.split("=")[1] || 3);
  return { lessonId, runs: Number.isFinite(runs) && runs > 0 ? Math.min(runs, 10) : 3 };
}

function stats(values: number[]) {
  if (!values.length) return { min: 0, max: 0, avg: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return {
    min: Math.round(sorted[0]!),
    max: Math.round(sorted[sorted.length - 1]!),
    avg: Math.round(sum / sorted.length),
    median: Math.round(median)
  };
}

async function measureOnce(lessonId: string) {
  const marks: Record<string, number> = {};
  const mark = (k: string) => {
    marks[k] = performance.now();
  };
  const ms = (a: string, b: string) => Math.round((marks[b] || 0) - (marks[a] || 0));
  let queryCount = 0;
  const q = async <T>(fn: () => Promise<T>): Promise<T> => {
    queryCount += 1;
    return fn();
  };

  mark("start");

  mark("lesson_read");
  const lesson = await q(() =>
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, moduleId: true, order: true }
    })
  );
  mark("lesson_read_end");
  if (!lesson) throw new Error("lesson not found");

  mark("blocks_read");
  const existing = await q(() =>
    prisma.contentBlock.findMany({
      where: { lessonId },
      select: {
        id: true,
        type: true,
        order: true,
        content: true,
        imagePath: true,
        imageCaption: true,
        isVisible: true,
        settings: true
      }
    })
  );
  mark("blocks_read_end");

  mark("checklist_read");
  const checklist = await q(() =>
    prisma.checklistItem.findMany({
      where: { lessonId },
      select: { id: true, text: true, order: true }
    })
  );
  mark("checklist_read_end");

  // Simulate full-document rewrite path used by saveLessonDocument (no content mutation).
  mark("tx_start");
  await prisma.$transaction(async (tx) => {
    mark("lesson_update");
    const current = await q(() =>
      tx.lesson.findUnique({ where: { id: lessonId }, select: { title: true, status: true, showAutoTitle: true } })
    );
    await q(() =>
      tx.lesson.update({
        where: { id: lessonId },
        data: {
          title: current!.title,
          status: current!.status,
          showAutoTitle: current!.showAutoTitle,
          blocksMigrated: true
        }
      })
    );
    mark("lesson_update_end");

    mark("reorder_temp");
    for (const [i, row] of existing.entries()) {
      await q(() =>
        tx.contentBlock.update({
          where: { id: row.id },
          data: { order: -5000 - i }
        })
      );
    }
    mark("reorder_temp_end");

    mark("blocks_write");
    for (const [i, row] of existing.entries()) {
      await q(() =>
        tx.contentBlock.update({
          where: { id: row.id },
          data: {
            type: row.type,
            order: i + 1,
            content: row.content,
            imagePath: row.imagePath,
            imageCaption: row.imageCaption,
            isVisible: row.isVisible,
            settings: row.settings
          }
        })
      );
    }
    mark("blocks_write_end");
  });
  mark("tx_end");

  mark("checklist_sync_start");
  // Mirror syncChecklistItems two-phase rewrite (no content change)
  await prisma.$transaction(async (tx) => {
    for (const [i, row] of checklist.entries()) {
      await q(() =>
        tx.checklistItem.update({
          where: { id: row.id },
          data: { order: -2000 - i }
        })
      );
    }
    for (const [i, row] of checklist.entries()) {
      await q(() =>
        tx.checklistItem.update({
          where: { id: row.id },
          data: { text: row.text, order: i + 1 }
        })
      );
    }
  });
  mark("checklist_sync_end");

  mark("final_read");
  await q(() =>
    prisma.contentBlock.findMany({
      where: { lessonId },
      orderBy: { order: "asc" }
    })
  );
  mark("final_read_end");
  mark("end");

  const contentChars = existing.reduce((n, b) => n + (b.content?.length || 0), 0);
  const payloadBytesApprox = JSON.stringify({
    lessonId,
    blockCount: existing.length,
    checklistCount: checklist.length,
    contentChars
  }).length;

  return {
    blockCount: existing.length,
    checklistCount: checklist.length,
    contentChars,
    payloadBytesApprox,
    queryCount,
    timings: {
      lesson_read_ms: ms("lesson_read", "lesson_read_end"),
      blocks_read_ms: ms("blocks_read", "blocks_read_end"),
      checklist_read_ms: ms("checklist_read", "checklist_read_end"),
      lesson_update_ms: ms("lesson_update", "lesson_update_end"),
      reorder_temp_ms: ms("reorder_temp", "reorder_temp_end"),
      blocks_write_ms: ms("blocks_write", "blocks_write_end"),
      transaction_ms: ms("tx_start", "tx_end"),
      checklist_sync_ms: ms("checklist_sync_start", "checklist_sync_end"),
      final_read_ms: ms("final_read", "final_read_end"),
      total_db_ms: ms("start", "end")
    }
  };
}

async function main() {
  const { lessonId: argLessonId, runs } = parseArgs();

  // Prefer a real published lesson with many blocks (representative of Base Mestra).
  let lessonId = argLessonId;
  if (!lessonId) {
    const sample = await prisma.lesson.findFirst({
      where: { status: "PUBLISHED", blocks: { some: {} } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        number: true,
        _count: { select: { blocks: true, checklistItems: true } }
      }
    });
    if (!sample) {
      console.error("No lesson found for audit.");
      process.exit(1);
    }
    lessonId = sample.id;
    console.log(
      JSON.stringify({
        event: "audit_target",
        lessonNumber: sample.number,
        blockCount: sample._count.blocks,
        checklistCount: sample._count.checklistItems
        // lessonId omitted from default log to reduce correlation risk; pass --lessonId to pin
      })
    );
  }

  // Warmup connection
  await prisma.$queryRaw`SELECT 1`;

  const results: Array<Awaited<ReturnType<typeof measureOnce>>> = [];
  for (let i = 0; i < runs; i++) {
    const r = await measureOnce(lessonId!);
    results.push(r);
    console.log(
      JSON.stringify({
        event: "audit_run",
        run: i + 1,
        blockCount: r.blockCount,
        checklistCount: r.checklistCount,
        queryCount: r.queryCount,
        payloadBytesApprox: r.payloadBytesApprox,
        ...r.timings
      })
    );
  }

  const pick = (key: keyof (typeof results)[0]["timings"]) => results.map((r) => r.timings[key]);
  const summary = {
    event: "audit_summary",
    runs,
    blockCount: results[0]?.blockCount,
    checklistCount: results[0]?.checklistCount,
    contentChars: results[0]?.contentChars,
    payloadBytesApprox: results[0]?.payloadBytesApprox,
    queryCount: results[0]?.queryCount,
    // Formula: existing reads + 1 lesson update + 2*N block updates (temp+final) + 2*C checklist + final read
    expectedQueryPattern: `~ ${3} reads + 1 lesson update + 2*N block updates + 2*C checklist + 1 final (N=blocks, C=checklist)`,
    totals: {
      lesson_read_ms: stats(pick("lesson_read_ms")),
      blocks_read_ms: stats(pick("blocks_read_ms")),
      transaction_ms: stats(pick("transaction_ms")),
      reorder_temp_ms: stats(pick("reorder_temp_ms")),
      blocks_write_ms: stats(pick("blocks_write_ms")),
      checklist_sync_ms: stats(pick("checklist_sync_ms")),
      final_read_ms: stats(pick("final_read_ms")),
      total_db_ms: stats(pick("total_db_ms"))
    }
  };
  console.log(JSON.stringify(summary, null, 2));

  // Connection info (no secrets)
  const db = process.env.DATABASE_URL || "";
  try {
    const u = new URL(db);
    console.log(
      JSON.stringify({
        event: "connection_info",
        host: u.hostname,
        port: u.port || "5432",
        pgbouncer: u.searchParams.get("pgbouncer"),
        poolerHost: u.hostname.includes("pooler")
      })
    );
  } catch {
    console.log(JSON.stringify({ event: "connection_info", parseError: true }));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
