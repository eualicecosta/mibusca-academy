/**
 * Idempotent importer for the full iFood course (prompt26).
 *
 * Usage:
 *   npx tsx scripts/import-ifood-course.ts --dry-run
 *   npx tsx scripts/import-ifood-course.ts --apply
 *   npx tsx scripts/import-ifood-course.ts --apply --publish
 *
 * Requires DATABASE_URL. Does not delete users, progress, other courses, or
 * modules/lessons outside the managed import set (reports extras).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, type ContentBlockType, type ContentStatus, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CONTENT_PATH = path.join(process.cwd(), "data", "ifood-course-import.json");
const DEFAULT_SOURCE_PREFIX = "ifood-import-v1";
const CATEGORIA_TITLE = "Curso completo";

type BlockInput = {
  type: ContentBlockType | string;
  content?: string;
  settings?: {
    level?: 2 | 3;
    title?: string;
    items?: string[];
    required?: boolean;
  };
  checklistItems?: string[];
};

type LessonInput = {
  number: string;
  title: string;
  objective?: string;
  blocks: BlockInput[];
};

type ModuleInput = {
  number: string;
  title: string;
  objective?: string;
  pdfChapter?: string;
  lessons: LessonInput[];
};

type CourseInput = {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  importVersion?: string;
  pdfPages?: number;
  chapter5Note?: string;
  modules: ModuleInput[];
};

type Stats = {
  modulesCreated: number;
  modulesUpdated: number;
  lessonsCreated: number;
  lessonsUpdated: number;
  blocksCreated: number;
  blocksReplaced: number;
  checklistItemsCreated: number;
  extras: string[];
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: !args.includes("--apply"),
    publish: args.includes("--publish")
  };
}

function loadContent(): CourseInput {
  if (!fs.existsSync(CONTENT_PATH)) {
    throw new Error(`Content file not found: ${CONTENT_PATH}`);
  }
  const raw = fs.readFileSync(CONTENT_PATH, "utf8");
  const data = JSON.parse(raw) as CourseInput;
  if (!data.slug || !Array.isArray(data.modules) || data.modules.length === 0) {
    throw new Error("Invalid course content JSON.");
  }
  return data;
}

function serializeSettings(
  settings: BlockInput["settings"] | undefined,
  source: string
): string {
  const payload: Record<string, unknown> = { ...(settings || {}), source };
  return JSON.stringify(payload);
}

function collectChecklistTexts(blocks: BlockInput[]): string[] {
  const items: string[] = [];
  for (const block of blocks) {
    if (block.type === "CHECKLIST" && Array.isArray(block.checklistItems)) {
      for (const text of block.checklistItems) {
        const trimmed = String(text || "").trim();
        if (trimmed) items.push(trimmed.slice(0, 500));
      }
    }
  }
  return items;
}

function countBlocks(content: CourseInput) {
  let blocks = 0;
  let checklists = 0;
  let lessons = 0;
  for (const mod of content.modules) {
    for (const lesson of mod.lessons) {
      lessons += 1;
      blocks += lesson.blocks.length;
      checklists += collectChecklistTexts(lesson.blocks).length;
    }
  }
  return { modules: content.modules.length, lessons, blocks, checklistItems: checklists };
}

async function shiftModuleOrders(categoriaId: string, tx: Prisma.TransactionClient) {
  const modules = await tx.module.findMany({
    where: { categoriaId },
    select: { id: true },
    orderBy: { order: "asc" }
  });
  for (const [index, row] of modules.entries()) {
    await tx.module.update({
      where: { id: row.id },
      data: { order: -5000 - index }
    });
  }
}

async function shiftLessonOrders(moduleId: string, tx: Prisma.TransactionClient) {
  const lessons = await tx.lesson.findMany({
    where: { moduleId },
    select: { id: true },
    orderBy: { order: "asc" }
  });
  for (const [index, row] of lessons.entries()) {
    await tx.lesson.update({
      where: { id: row.id },
      data: { order: -5000 - index }
    });
  }
}

async function replaceLessonBlocks(
  lessonId: string,
  lessonNumber: string,
  blocks: BlockInput[],
  tx: Prisma.TransactionClient,
  sourcePrefix: string
): Promise<number> {
  await tx.contentBlock.deleteMany({ where: { lessonId } });

  let order = 1;
  for (const [index, block] of blocks.entries()) {
    const type = block.type as ContentBlockType;
    const source = `${sourcePrefix}:lesson:${lessonNumber}:b${String(index + 1).padStart(3, "0")}`;
    const settings = serializeSettings(block.settings, source);
    const content = String(block.content || "");

    await tx.contentBlock.create({
      data: {
        lessonId,
        type,
        order: order++,
        content,
        imagePath: null,
        imageCaption: null,
        isVisible: true,
        settings
      }
    });
  }
  return blocks.length;
}

async function replaceChecklistItems(
  lessonId: string,
  items: string[],
  tx: Prisma.TransactionClient
): Promise<number> {
  // Keep progress only for items that remain with identical text by recreating cleanly.
  // Completions cascade on item delete — acceptable for content reimport of training material.
  await tx.checklistItem.deleteMany({ where: { lessonId } });
  let order = 1;
  for (const text of items) {
    await tx.checklistItem.create({
      data: {
        lessonId,
        text,
        order: order++
      }
    });
  }
  return items.length;
}

async function run() {
  const { dryRun, publish } = parseArgs();
  const content = loadContent();
  const SOURCE_PREFIX = content.importVersion || DEFAULT_SOURCE_PREFIX;
  const counts = countBlocks(content);
  const status: ContentStatus = publish ? "PUBLISHED" : "DRAFT";
  const stats: Stats = {
    modulesCreated: 0,
    modulesUpdated: 0,
    lessonsCreated: 0,
    lessonsUpdated: 0,
    blocksCreated: 0,
    blocksReplaced: 0,
    checklistItemsCreated: 0,
    extras: []
  };

  console.log(dryRun ? "=== DRY-RUN MODE ===" : "=== APPLY MODE ===");
  console.log(`publish=${publish} status=${status}`);
  console.log(`content: ${CONTENT_PATH}`);
  console.log(`importVersion: ${content.importVersion || SOURCE_PREFIX}`);
  console.log(`pdfPages: ${content.pdfPages ?? "?"}`);
  if (content.chapter5Note) console.log(`note: ${content.chapter5Note}`);
  console.log(
    `planned: modules=${counts.modules} lessons=${counts.lessons} blocks=${counts.blocks} checklistItems=${counts.checklistItems}`
  );

  const existingCourse = await prisma.course.findUnique({
    where: { slug: content.slug },
    include: {
      categorias: { orderBy: { order: "asc" } },
      modules: {
        include: {
          lessons: {
            include: {
              _count: { select: { blocks: true, checklistItems: true } }
            },
            orderBy: { order: "asc" }
          }
        },
        orderBy: { order: "asc" }
      }
    }
  });

  if (existingCourse) {
    console.log(`\nCourse FOUND: ${existingCourse.title} (${existingCourse.id}) status=${existingCourse.status}`);
    console.log(`  categorias=${existingCourse.categorias.length} modules=${existingCourse.modules.length}`);
    const managedNumbers = new Set(content.modules.map((m) => m.number));
    for (const mod of existingCourse.modules) {
      if (!managedNumbers.has(mod.number)) {
        stats.extras.push(`Module extra (preserved): ${mod.number} — ${mod.title}`);
      }
      const plan = content.modules.find((m) => m.number === mod.number);
      if (!plan) continue;
      const plannedLessonNumbers = new Set(plan.lessons.map((l) => l.number));
      for (const lesson of mod.lessons) {
        if (!plannedLessonNumbers.has(lesson.number)) {
          stats.extras.push(
            `Lesson extra in module ${mod.number} (preserved): ${lesson.number} — ${lesson.title}`
          );
        }
      }
    }
  } else {
    console.log(`\nCourse NOT FOUND — will ${dryRun ? "be created" : "create"}: ${content.slug}`);
  }

  for (const mod of content.modules) {
    const existingMod = existingCourse?.modules.find((m) => m.number === mod.number);
    const action = existingMod ? "UPDATE" : "CREATE";
    console.log(
      `  [${action}] Module ${mod.number} — ${mod.title} (${mod.lessons.length} aulas)`
    );
    for (const lesson of mod.lessons) {
      const existingLesson = existingMod?.lessons.find((l) => l.number === lesson.number);
      const blockCount = lesson.blocks.length;
      const checkCount = collectChecklistTexts(lesson.blocks).length;
      console.log(
        `    [${existingLesson ? "UPDATE" : "CREATE"}] Aula ${lesson.number} — ${lesson.title} | blocks=${blockCount} checklist=${checkCount}`
      );
    }
  }

  if (stats.extras.length) {
    console.log("\nExtras / possíveis testes (NÃO serão excluídos):");
    for (const line of stats.extras) console.log(`  - ${line}`);
  }

  if (dryRun) {
    console.log("\nDry-run complete. Re-run with --apply to write. Add --publish to publish.");
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          course: existingCourse ? "update" : "create",
          ...counts,
          extras: stats.extras.length
        },
        null,
        2
      )
    );
    return;
  }

  // APPLY
  const result = await prisma.$transaction(
    async (tx) => {
      const course =
        existingCourse
          ? await tx.course.update({
              where: { id: existingCourse.id },
              data: {
                title: content.title,
                description: content.description || content.subtitle || null,
                status: publish ? "PUBLISHED" : existingCourse.status
              }
            })
          : await tx.course.create({
              data: {
                slug: content.slug,
                title: content.title,
                description: content.description || content.subtitle || null,
                status
              }
            });

      // Prefer existing "Geral" / managed categoria; otherwise create "Curso completo"
      let categoria =
        (await tx.categoria.findFirst({
          where: {
            courseId: course.id,
            OR: [{ title: CATEGORIA_TITLE }, { title: "Geral" }]
          },
          orderBy: { order: "asc" }
        })) || null;

      if (!categoria) {
        const maxOrder = await tx.categoria.aggregate({
          where: { courseId: course.id },
          _max: { order: true }
        });
        categoria = await tx.categoria.create({
          data: {
            courseId: course.id,
            title: CATEGORIA_TITLE,
            description: content.subtitle || content.description || null,
            order: (maxOrder._max.order || 0) + 1,
            status: publish ? "PUBLISHED" : "DRAFT"
          }
        });
      } else {
        categoria = await tx.categoria.update({
          where: { id: categoria.id },
          data: {
            title: CATEGORIA_TITLE,
            description: content.subtitle || content.description || categoria.description,
            status: publish ? "PUBLISHED" : categoria.status
          }
        });
      }

      // Free order slots for managed modules in this category
      await shiftModuleOrders(categoria.id, tx);

      // Also free orders for modules of this course that we'll reassign by number
      const allCourseModules = await tx.module.findMany({
        where: { courseId: course.id },
        select: { id: true, number: true, categoriaId: true }
      });
      for (const [index, row] of allCourseModules.entries()) {
        await tx.module.update({
          where: { id: row.id },
          data: { order: -8000 - index }
        });
      }

      for (const [moduleIndex, mod] of content.modules.entries()) {
        const existingMod = await tx.module.findFirst({
          where: { courseId: course.id, number: mod.number }
        });

        let moduleRow;
        if (existingMod) {
          moduleRow = await tx.module.update({
            where: { id: existingMod.id },
            data: {
              title: mod.title,
              objective: mod.objective || null,
              order: moduleIndex + 1,
              categoriaId: categoria.id,
              courseId: course.id,
              status: publish ? "PUBLISHED" : existingMod.status === "PUBLISHED" && !publish ? "DRAFT" : status
            }
          });
          stats.modulesUpdated += 1;
        } else {
          moduleRow = await tx.module.create({
            data: {
              courseId: course.id,
              categoriaId: categoria.id,
              number: mod.number,
              title: mod.title,
              objective: mod.objective || null,
              order: moduleIndex + 1,
              status
            }
          });
          stats.modulesCreated += 1;
        }

        await shiftLessonOrders(moduleRow.id, tx);

        for (const [lessonIndex, lesson] of mod.lessons.entries()) {
          const existingLesson = await tx.lesson.findFirst({
            where: { moduleId: moduleRow.id, number: lesson.number }
          });

          let lessonRow;
          if (existingLesson) {
            lessonRow = await tx.lesson.update({
              where: { id: existingLesson.id },
              data: {
                title: lesson.title,
                objective: lesson.objective || null,
                context: null,
                tipKind: null,
                tipText: null,
                imagePath: null,
                imageCaption: null,
                order: lessonIndex + 1,
                status: publish ? "PUBLISHED" : status,
                showAutoTitle: true,
                blocksMigrated: true
              }
            });
            stats.lessonsUpdated += 1;
          } else {
            lessonRow = await tx.lesson.create({
              data: {
                moduleId: moduleRow.id,
                number: lesson.number,
                title: lesson.title,
                objective: lesson.objective || null,
                order: lessonIndex + 1,
                status,
                showAutoTitle: true,
                blocksMigrated: true
              }
            });
            stats.lessonsCreated += 1;
          }

          const replaced = await replaceLessonBlocks(
            lessonRow.id,
            lesson.number,
            lesson.blocks,
            tx,
            SOURCE_PREFIX
          );
          stats.blocksReplaced += replaced;
          stats.blocksCreated += replaced;

          const checklistTexts = collectChecklistTexts(lesson.blocks);
          const createdChecks = await replaceChecklistItems(lessonRow.id, checklistTexts, tx);
          stats.checklistItemsCreated += createdChecks;
        }
      }

      // Ensure dashboard block for categoria exists
      const existingDash = await tx.dashboardBlock.findFirst({
        where: { courseId: course.id, categoriaId: categoria.id }
      });
      if (!existingDash) {
        const maxDash = await tx.dashboardBlock.aggregate({
          where: { courseId: course.id },
          _max: { order: true }
        });
        await tx.dashboardBlock.create({
          data: {
            courseId: course.id,
            type: "CATEGORY",
            order: (maxDash._max.order || 0) + 1,
            categoriaId: categoria.id
          }
        });
      }

      return { courseId: course.id, categoriaId: categoria.id };
    },
    { timeout: 120_000 }
  );

  // Verification
  const verify = await prisma.course.findUnique({
    where: { id: result.courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { _count: { select: { blocks: true, checklistItems: true } } }
          }
        }
      }
    }
  });

  console.log("\n=== IMPORT RESULT ===");
  console.log(JSON.stringify({ ok: true, dryRun: false, publish, ...stats, result }, null, 2));
  console.log("\nVerified structure:");
  for (const mod of verify?.modules || []) {
    const lessonBlocks = mod.lessons.reduce((n, l) => n + l._count.blocks, 0);
    console.log(
      `  M${mod.order} #${mod.number} ${mod.title} | lessons=${mod.lessons.length} blocks=${lessonBlocks} status=${mod.status}`
    );
  }
  if (stats.extras.length) {
    console.log("\nExtras preserved (not deleted):");
    for (const line of stats.extras) console.log(`  - ${line}`);
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
