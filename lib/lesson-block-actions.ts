"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { ContentBlockType, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import {
  blockSummary,
  isLessonBlockType,
  parseBlockSettings,
  serializeBlockSettings,
  validateBlockInput,
  type BlockSettings,
  type LessonBlockDTO
} from "@/lib/lesson-blocks";
import { prisma } from "@/lib/prisma";
import { uploadImageToR2, sanitizeStorageName } from "@/lib/r2";

function revalidateLesson(moduleId: string, lessonId: string, options?: { quiet?: boolean }) {
  // Quiet autosaves must NOT revalidate routes — that can interrupt the editor RSC tree.
  // Client keeps local state; student routes refresh on next navigation.
  if (options?.quiet) {
    return;
  }
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath(`/admin/conteudo/${moduleId}`);
  revalidatePath(`/curso/${lessonId}`);
  revalidatePath("/dashboard");
  revalidatePath("/curso");
}

function logActionError(action: string, meta: Record<string, string | undefined>, error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(
    JSON.stringify({
      scope: "lesson-editor",
      action,
      ...meta,
      error: message
    })
  );
}

function isPersistedChecklistId(id: string | undefined | null, existingIds: Set<string>): id is string {
  if (!id) return false;
  // Client temp ids look like tmp-0 / tmp-1 — never send those to Prisma update.
  if (id.startsWith("tmp-") || id.startsWith("local-")) return false;
  return existingIds.has(id);
}

function toDTO(block: {
  id: string;
  lessonId: string;
  type: ContentBlockType;
  order: number;
  content: string;
  imagePath: string | null;
  imageCaption: string | null;
  isVisible: boolean;
  settings: string | null;
}): LessonBlockDTO {
  return {
    id: block.id,
    lessonId: block.lessonId,
    type: block.type,
    order: block.order,
    content: block.content,
    imagePath: block.imagePath,
    imageCaption: block.imageCaption,
    isVisible: block.isVisible,
    settings: parseBlockSettings(block.settings)
  };
}

async function getLessonMeta(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, moduleId: true, title: true }
  });
}

export async function getLessonBlocksAdmin(lessonId: string): Promise<
  | {
      ok: true;
      lesson: {
        id: string;
        moduleId: string;
        title: string;
        number: string;
        order: number;
        status: string;
        showAutoTitle: boolean;
        blocksMigrated: boolean;
      };
      blocks: LessonBlockDTO[];
      checklistItems: Array<{ id: string; text: string; order: number }>;
    }
  | { ok: false; error: string }
> {
  await requireAdmin();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      moduleId: true,
      title: true,
      number: true,
      order: true,
      status: true,
      showAutoTitle: true,
      blocksMigrated: true,
      blocks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          lessonId: true,
          type: true,
          order: true,
          content: true,
          imagePath: true,
          imageCaption: true,
          isVisible: true,
          settings: true
        }
      },
      checklistItems: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, order: true }
      }
    }
  });

  if (!lesson) return { ok: false, error: "Aula não encontrada." };

  return {
    ok: true,
    lesson: {
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      number: lesson.number,
      order: lesson.order,
      status: lesson.status,
      showAutoTitle: lesson.showAutoTitle,
      blocksMigrated: lesson.blocksMigrated
    },
    blocks: lesson.blocks.map(toDTO),
    checklistItems: lesson.checklistItems
  };
}

export async function updateLessonMeta(input: {
  lessonId: string;
  title?: string;
  order?: number;
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN";
  showAutoTitle?: boolean;
  quiet?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  try {
    await requireAdmin();
    const lesson = await getLessonMeta(input.lessonId);
    if (!lesson) return { ok: false, error: "Aula não encontrada.", code: "NOT_FOUND" };

    const data: Prisma.LessonUpdateInput = {};
    if (typeof input.title === "string") data.title = input.title.trim().slice(0, 200) || "Sem título";
    if (typeof input.order === "number" && Number.isFinite(input.order)) data.order = Math.max(1, Math.floor(input.order));
    if (input.status === "DRAFT" || input.status === "PUBLISHED" || input.status === "HIDDEN") data.status = input.status;
    if (typeof input.showAutoTitle === "boolean") data.showAutoTitle = input.showAutoTitle;

    await prisma.lesson.update({ where: { id: lesson.id }, data });
    // Title list needs admin revalidate only when not quiet typing.
    revalidateLesson(lesson.moduleId, lesson.id, { quiet: input.quiet ?? true });
    return { ok: true };
  } catch (error) {
    logActionError("updateLessonMeta", { lessonId: input.lessonId }, error);
    return { ok: false, error: "Não foi possível salvar os dados da aula.", code: "DATABASE_ERROR" };
  }
}

export async function createLessonBlock(input: {
  lessonId: string;
  type: string;
  afterOrder?: number | null;
  content?: string;
  settings?: BlockSettings;
  quiet?: boolean;
}): Promise<{ ok: true; block: LessonBlockDTO } | { ok: false; error: string; code?: string }> {
  try {
  await requireAdmin();
  const lesson = await getLessonMeta(input.lessonId);
  if (!lesson) return { ok: false, error: "Aula não encontrada.", code: "NOT_FOUND" };

  // Canvas starts blocks empty (Notion-like); placeholders are visual only.
  const seedContent =
    input.content !== undefined ? input.content : input.type === "DIVIDER" || input.type === "IMAGE" ? "" : "";

  const validated = validateBlockInput({
    type: input.type,
    content: seedContent,
    settings: input.settings
  });
  if (!validated.ok) return validated;

  const existing = await prisma.contentBlock.findMany({
    where: { lessonId: lesson.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true }
  });

  const insertAt =
    typeof input.afterOrder === "number"
      ? existing.filter((b) => b.order <= input.afterOrder!).length
      : existing.length;

  const block = await prisma.$transaction(async (tx) => {
    // Shift orders to make room (two-phase to avoid unique collisions).
    for (let i = existing.length - 1; i >= insertAt; i -= 1) {
      await tx.contentBlock.update({
        where: { id: existing[i].id },
        data: { order: existing[i].order + 1000 }
      });
    }
    for (let i = existing.length - 1; i >= insertAt; i -= 1) {
      await tx.contentBlock.update({
        where: { id: existing[i].id },
        data: { order: i + 2 }
      });
    }

    return tx.contentBlock.create({
      data: {
        lessonId: lesson.id,
        type: validated.type,
        order: insertAt + 1,
        content: validated.content,
        settings: serializeBlockSettings(validated.settings),
        isVisible: true
      }
    });
  });

  // Normalize orders 1..n
  await normalizeBlockOrders(lesson.id);

  const fresh = await prisma.contentBlock.findUniqueOrThrow({ where: { id: block.id } });
  revalidateLesson(lesson.moduleId, lesson.id, { quiet: input.quiet });
  return { ok: true, block: toDTO(fresh) };
  } catch (error) {
    logActionError("createLessonBlock", { lessonId: input.lessonId, type: input.type }, error);
    return { ok: false, error: "Não foi possível criar o bloco.", code: "DATABASE_ERROR" };
  }
}

export async function updateLessonBlock(input: {
  blockId: string;
  content?: string;
  imagePath?: string | null;
  imageCaption?: string | null;
  isVisible?: boolean;
  settings?: BlockSettings;
  type?: string;
  checklistItems?: Array<{ id?: string; text: string }>;
  quiet?: boolean;
  /** Client generation to detect stale responses (returned as-is). */
  clientRev?: number;
}): Promise<
  | {
      ok: true;
      block: LessonBlockDTO;
      clientRev?: number;
      checklistItems?: Array<{ id: string; text: string; order: number }>;
    }
  | { ok: false; error: string; code?: string; clientRev?: number }
> {
  try {
    await requireAdmin();

    const current = await prisma.contentBlock.findUnique({
      where: { id: input.blockId },
      include: { lesson: { select: { id: true, moduleId: true } } }
    });
    if (!current) {
      return { ok: false, error: "Bloco não encontrado.", code: "NOT_FOUND", clientRev: input.clientRev };
    }

    const nextType = input.type && isLessonBlockType(input.type) ? input.type : current.type;
    const nextSettings = input.settings !== undefined ? input.settings : parseBlockSettings(current.settings);
    const nextContent = input.content !== undefined ? input.content : current.content;

    const validated = validateBlockInput({
      type: nextType,
      content: nextContent,
      imagePath: input.imagePath !== undefined ? input.imagePath : current.imagePath,
      imageCaption: input.imageCaption !== undefined ? input.imageCaption : current.imageCaption,
      settings: nextSettings
    });
    if (!validated.ok) {
      return { ok: false, error: validated.error, code: "VALIDATION_ERROR", clientRev: input.clientRev };
    }

    let checklistItems: Array<{ id: string; text: string; order: number }> | undefined;

    if ((validated.type === "CHECKLIST" || input.checklistItems) && input.checklistItems) {
      checklistItems = await syncChecklistItems(current.lessonId, input.checklistItems);
    }

    if (validated.type === "CHECKBOX") {
      await syncSingleCheckbox(current.lessonId, current, validated.content, nextSettings);
    }

    const updated = await prisma.contentBlock.update({
      where: { id: current.id },
      data: {
        type: validated.type,
        content: validated.content,
        settings: serializeBlockSettings(validated.settings),
        ...(input.imagePath !== undefined ? { imagePath: input.imagePath } : {}),
        ...(input.imageCaption !== undefined ? { imageCaption: input.imageCaption } : {}),
        ...(typeof input.isVisible === "boolean" ? { isVisible: input.isVisible } : {})
      }
    });

    revalidateLesson(current.lesson.moduleId, current.lesson.id, { quiet: input.quiet });
    return {
      ok: true,
      block: toDTO(updated),
      clientRev: input.clientRev,
      checklistItems
    };
  } catch (error) {
    logActionError("updateLessonBlock", { blockId: input.blockId }, error);
    return {
      ok: false,
      error: "Não foi possível salvar. Tente novamente.",
      code: "DATABASE_ERROR",
      clientRev: input.clientRev
    };
  }
}

/**
 * Sync checklist items for a lesson.
 * - Never treats client temp ids (tmp-*) as Prisma ids
 * - Creates missing items, updates existing, deletes only when removed from the full list
 * - Preserves progress for kept ids
 */
async function syncChecklistItems(
  lessonId: string,
  items: Array<{ id?: string; text: string }>
): Promise<Array<{ id: string; text: string; order: number }>> {
  const existing = await prisma.checklistItem.findMany({
    where: { lessonId },
    select: { id: true }
  });
  const existingIdSet = new Set(existing.map((row) => row.id));

  // Normalize payload: strip temp ids for create path; keep empty rows only if they have real ids (user cleared text).
  const normalized = items.map((item) => ({
    id: item.id,
    text: String(item.text || "").trim().slice(0, 500),
    isReal: isPersistedChecklistId(item.id, existingIdSet)
  }));

  // IDs present in the client list (including empty text with real id) — do not delete those.
  const clientRealIds = new Set(normalized.filter((item) => item.isReal).map((item) => item.id as string));

  // Rows to persist with text (create or update). Empty brand-new temps are ignored until the user types.
  const toPersist = normalized.filter((item) => item.text.length > 0 || item.isReal);

  // Delete only real items completely absent from the client list.
  const toDelete = existing.filter((row) => !clientRealIds.has(row.id)).map((row) => row.id);

  await prisma.$transaction(async (tx) => {
    if (toDelete.length) {
      // Progress is cascade-deleted with the item relation — only when admin truly removed the row.
      await tx.checklistCompletion.deleteMany({ where: { checklistItemId: { in: toDelete } } });
      await tx.checklistItem.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Two-phase order rewrite on remaining rows to avoid unique collisions.
    const remaining = await tx.checklistItem.findMany({
      where: { lessonId },
      select: { id: true }
    });
    for (const [index, row] of remaining.entries()) {
      await tx.checklistItem.update({
        where: { id: row.id },
        data: { order: -2000 - index }
      });
    }

    let order = 1;
    for (const item of toPersist) {
      if (item.isReal && item.id) {
        await tx.checklistItem.update({
          where: { id: item.id },
          data: {
            text: item.text || " ",
            order: order++
          }
        });
      } else if (item.text) {
        await tx.checklistItem.create({
          data: {
            lessonId,
            text: item.text,
            order: order++
          }
        });
      }
    }
  });

  return prisma.checklistItem.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
    select: { id: true, text: true, order: true }
  });
}

async function syncSingleCheckbox(
  lessonId: string,
  block: { id: string; settings: string | null },
  text: string,
  settings: BlockSettings
) {
  const existingId = settings.checklistItemId || parseBlockSettings(block.settings).checklistItemId;
  if (existingId) {
    const found = await prisma.checklistItem.findFirst({ where: { id: existingId, lessonId } });
    if (found) {
      await prisma.checklistItem.update({
        where: { id: found.id },
        data: { text: text.slice(0, 500) }
      });
      return;
    }
  }

  const last = await prisma.checklistItem.findFirst({
    where: { lessonId },
    orderBy: { order: "desc" },
    select: { order: true }
  });
  const created = await prisma.checklistItem.create({
    data: {
      lessonId,
      text: text.slice(0, 500),
      order: (last?.order || 0) + 1
    }
  });
  settings.checklistItemId = created.id;
  await prisma.contentBlock.update({
    where: { id: block.id },
    data: { settings: serializeBlockSettings(settings) }
  });
}

export async function toggleLessonBlockVisibility(
  blockId: string
): Promise<{ ok: true; block: LessonBlockDTO } | { ok: false; error: string; code?: string }> {
  try {
    await requireAdmin();
    const current = await prisma.contentBlock.findUnique({
      where: { id: blockId },
      include: { lesson: { select: { id: true, moduleId: true } } }
    });
    if (!current) return { ok: false, error: "Bloco não encontrado.", code: "NOT_FOUND" };

    const updated = await prisma.contentBlock.update({
      where: { id: blockId },
      data: { isVisible: !current.isVisible }
    });
    revalidateLesson(current.lesson.moduleId, current.lesson.id, { quiet: true });
    return { ok: true, block: toDTO(updated) };
  } catch (error) {
    logActionError("toggleLessonBlockVisibility", { blockId }, error);
    return { ok: false, error: "Não foi possível alterar a visibilidade.", code: "DATABASE_ERROR" };
  }
}

export async function duplicateLessonBlock(
  blockId: string
): Promise<{ ok: true; block: LessonBlockDTO } | { ok: false; error: string }> {
  await requireAdmin();
  const current = await prisma.contentBlock.findUnique({
    where: { id: blockId },
    include: { lesson: { select: { id: true, moduleId: true } } }
  });
  if (!current) return { ok: false, error: "Bloco não encontrado." };

  const created = await createLessonBlock({
    lessonId: current.lessonId,
    type: current.type,
    afterOrder: current.order,
    content: current.content,
    settings: parseBlockSettings(current.settings)
  });

  if (!created.ok) return created;

  if (current.imagePath || current.imageCaption) {
    const withImage = await prisma.contentBlock.update({
      where: { id: created.block.id },
      data: {
        imagePath: current.imagePath,
        imageCaption: current.imageCaption
      }
    });
    revalidateLesson(current.lesson.moduleId, current.lesson.id);
    return { ok: true, block: toDTO(withImage) };
  }

  return created;
}

export async function deleteLessonBlock(
  blockId: string,
  options?: { confirmProgressLoss?: boolean }
): Promise<{ ok: true } | { ok: false; error: string; requiresConfirm?: boolean; code?: string }> {
  try {
  await requireAdmin();
  const current = await prisma.contentBlock.findUnique({
    where: { id: blockId },
    include: { lesson: { select: { id: true, moduleId: true } } }
  });
  if (!current) return { ok: false, error: "Bloco não encontrado.", code: "NOT_FOUND" };

  const settings = parseBlockSettings(current.settings);

  if (current.type === "CHECKBOX" && settings.checklistItemId) {
    const completions = await prisma.checklistCompletion.count({
      where: { checklistItemId: settings.checklistItemId, checked: true }
    });
    if (completions > 0 && !options?.confirmProgressLoss) {
      return {
        ok: false,
        error: `Este checkbox possui ${completions} registro(s) de progresso. Confirme para excluir.`,
        requiresConfirm: true
      };
    }
  }

  if (current.type === "CHECKLIST") {
    const items = await prisma.checklistItem.findMany({
      where: { lessonId: current.lessonId },
      select: { id: true }
    });
    if (items.length) {
      const completions = await prisma.checklistCompletion.count({
        where: { checklistItemId: { in: items.map((i) => i.id) }, checked: true }
      });
      if (completions > 0 && !options?.confirmProgressLoss) {
        return {
          ok: false,
          error: `Este checklist possui ${completions} registro(s) de progresso. Confirme para excluir o bloco (os itens da aula serão mantidos).`,
          requiresConfirm: true
        };
      }
    }
    // Only remove the block marker — keep checklist items for progress integrity unless confirmed and no other checklist block
  }

  if (current.type === "CHECKBOX" && settings.checklistItemId && options?.confirmProgressLoss) {
    await prisma.$transaction([
      prisma.checklistCompletion.deleteMany({ where: { checklistItemId: settings.checklistItemId } }),
      prisma.checklistItem.delete({ where: { id: settings.checklistItemId } }),
      prisma.contentBlock.delete({ where: { id: blockId } })
    ]);
  } else {
    await prisma.contentBlock.delete({ where: { id: blockId } });
  }

  await normalizeBlockOrders(current.lessonId);
  revalidateLesson(current.lesson.moduleId, current.lesson.id, { quiet: true });
  return { ok: true };
  } catch (error) {
    logActionError("deleteLessonBlock", { blockId }, error);
    return { ok: false, error: "Não foi possível excluir o bloco.", code: "DATABASE_ERROR" };
  }
}

export async function reorderLessonBlocks(
  lessonId: string,
  orderedIds: string[],
  options?: { quiet?: boolean }
): Promise<{ ok: true; blocks: LessonBlockDTO[] } | { ok: false; error: string; code?: string }> {
  try {
    await requireAdmin();
    const lesson = await getLessonMeta(lessonId);
    if (!lesson) return { ok: false, error: "Aula não encontrada.", code: "NOT_FOUND" };

    const existing = await prisma.contentBlock.findMany({
      where: { lessonId },
      select: { id: true }
    });
    const existingIds = new Set(existing.map((b) => b.id));
    if (orderedIds.length !== existing.length || orderedIds.some((id) => !existingIds.has(id))) {
      return {
        ok: false,
        error: "Ordem inválida — recarregue a aula e tente novamente.",
        code: "CONFLICT"
      };
    }

    await prisma.$transaction([
      ...orderedIds.map((id, index) =>
        prisma.contentBlock.update({ where: { id }, data: { order: -1000 - index } })
      ),
      ...orderedIds.map((id, index) =>
        prisma.contentBlock.update({ where: { id }, data: { order: index + 1 } })
      )
    ]);

    const blocks = await prisma.contentBlock.findMany({
      where: { lessonId },
      orderBy: { order: "asc" }
    });
    revalidateLesson(lesson.moduleId, lesson.id, { quiet: options?.quiet });
    return { ok: true, blocks: blocks.map(toDTO) };
  } catch (error) {
    logActionError("reorderLessonBlocks", { lessonId }, error);
    return { ok: false, error: "Não foi possível reordenar os blocos.", code: "DATABASE_ERROR" };
  }
}

export async function uploadLessonBlockImage(
  formData: FormData
): Promise<{ ok: true; path: string; block?: LessonBlockDTO } | { ok: false; error: string; code?: string }> {
  try {
    await requireAdmin();
    const blockId = String(formData.get("blockId") || "");
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Selecione uma imagem.", code: "VALIDATION_ERROR" };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, error: "Imagem muito grande (máx. 8MB).", code: "VALIDATION_ERROR" };
    }
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "Arquivo deve ser uma imagem.", code: "VALIDATION_ERROR" };
    }

    const block = blockId
      ? await prisma.contentBlock.findUnique({
          where: { id: blockId },
          include: { lesson: { select: { id: true, moduleId: true } } }
        })
      : null;

    const folder = block ? `aulas/${block.lessonId}` : "aulas";
    const path = await uploadImageToR2(file, folder, { upsert: false });
    revalidateTag("r2-images");

    if (block) {
      const updated = await prisma.contentBlock.update({
        where: { id: block.id },
        data: {
          imagePath: path,
          type: block.type === "IMAGE" ? "IMAGE" : block.type,
          settings: serializeBlockSettings({
            ...parseBlockSettings(block.settings),
            alt: parseBlockSettings(block.settings).alt || sanitizeStorageName(file.name)
          })
        }
      });
      revalidateLesson(block.lesson.moduleId, block.lesson.id, { quiet: true });
      return { ok: true, path, block: toDTO(updated) };
    }

    return { ok: true, path };
  } catch (error) {
    logActionError("uploadLessonBlockImage", {}, error);
    return { ok: false, error: "Falha no upload da imagem.", code: "UPLOAD_ERROR" };
  }
}

async function normalizeBlockOrders(lessonId: string) {
  const blocks = await prisma.contentBlock.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
    select: { id: true }
  });
  await prisma.$transaction([
    ...blocks.map((b, index) => prisma.contentBlock.update({ where: { id: b.id }, data: { order: -2000 - index } })),
    ...blocks.map((b, index) => prisma.contentBlock.update({ where: { id: b.id }, data: { order: index + 1 } }))
  ]);
}

export async function migrateLegacyLessonContent(options?: {
  dryRun?: boolean;
  lessonId?: string;
}): Promise<{
  ok: true;
  dryRun: boolean;
  lessonsScanned: number;
  lessonsMigrated: number;
  blocksCreated: number;
  skipped: number;
  details: Array<{ lessonId: string; title: string; created: number; reason?: string }>;
}> {
  await requireAdmin();
  const dryRun = Boolean(options?.dryRun);

  const lessons = await prisma.lesson.findMany({
    where: options?.lessonId ? { id: options.lessonId } : undefined,
    orderBy: [{ moduleId: "asc" }, { order: "asc" }],
    select: {
      id: true,
      title: true,
      objective: true,
      context: true,
      tipKind: true,
      tipText: true,
      imagePath: true,
      imageCaption: true,
      blocksMigrated: true,
      blocks: {
        orderBy: { order: "asc" },
        select: { id: true, type: true, order: true, content: true, imagePath: true, imageCaption: true, settings: true }
      },
      checklistItems: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, order: true }
      }
    }
  });

  let lessonsMigrated = 0;
  let blocksCreated = 0;
  let skipped = 0;
  const details: Array<{ lessonId: string; title: string; created: number; reason?: string }> = [];

  for (const lesson of lessons) {
    if (lesson.blocksMigrated) {
      skipped += 1;
      details.push({ lessonId: lesson.id, title: lesson.title, created: 0, reason: "já migrada" });
      continue;
    }

    const existingSources = new Set(
      lesson.blocks
        .map((b) => parseBlockSettings(b.settings).source)
        .filter(Boolean) as string[]
    );

    type NewBlock = {
      type: ContentBlockType;
      content: string;
      imagePath?: string | null;
      imageCaption?: string | null;
      settings?: BlockSettings;
    };

    const toCreate: NewBlock[] = [];

    // If there are already STEP/IMAGE blocks from old content editor, keep them — only add missing legacy fields.
    if (lesson.objective?.trim() && !existingSources.has("legacy-objective")) {
      toCreate.push({
        type: "TIP",
        content: lesson.objective.trim(),
        settings: { title: "Objetivo", source: "legacy-objective" }
      });
    }
    if (lesson.context?.trim() && !existingSources.has("legacy-context")) {
      toCreate.push({
        type: "TEXT",
        content: lesson.context.trim(),
        settings: { source: "legacy-context" }
      });
    }

    // Existing STEP blocks already represent "passo a passo" — leave them.
    // Mark STEP blocks without source as legacy-step via update when not dry-run.

    if (lesson.tipText?.trim() && !existingSources.has("legacy-tip")) {
      const kind = (lesson.tipKind || "").toLowerCase();
      const type: ContentBlockType =
        kind.includes("aten") || kind.includes("warning") ? "WARNING" : kind.includes("info") ? "INFO" : "TIP";
      toCreate.push({
        type,
        content: lesson.tipText.trim(),
        settings: { title: lesson.tipKind || undefined, source: "legacy-tip" }
      });
    }

    if (lesson.imagePath && !existingSources.has("legacy-lesson-image")) {
      const already = lesson.blocks.some((b) => b.imagePath === lesson.imagePath);
      if (!already) {
        toCreate.push({
          type: "IMAGE",
          content: "",
          imagePath: lesson.imagePath,
          imageCaption: lesson.imageCaption,
          settings: { source: "legacy-lesson-image", alt: lesson.imageCaption || lesson.title }
        });
      }
    }

    if (lesson.checklistItems.length && !existingSources.has("legacy-checklist")) {
      const hasChecklistBlock = lesson.blocks.some((b) => b.type === "CHECKLIST");
      if (!hasChecklistBlock) {
        toCreate.push({
          type: "CHECKLIST",
          content: "Checklist de conclusão",
          settings: { title: "Checklist de conclusão", source: "legacy-checklist" }
        });
      }
    }

    // If lesson has only legacy STEP blocks and no structural migration needed, still mark migrated
    // after ensuring objective/context/tip handled.
    if (!toCreate.length && lesson.blocks.length === 0 && !lesson.objective && !lesson.context && !lesson.tipText) {
      if (!dryRun) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { blocksMigrated: true } });
      }
      skipped += 1;
      details.push({ lessonId: lesson.id, title: lesson.title, created: 0, reason: "sem conteúdo legado" });
      continue;
    }

    if (!toCreate.length) {
      if (!dryRun) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { blocksMigrated: true } });
      }
      lessonsMigrated += 1;
      details.push({ lessonId: lesson.id, title: lesson.title, created: 0, reason: "flag marcada (blocos já presentes)" });
      continue;
    }

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        // Insert new blocks at the beginning (objective/context first), then existing steps keep relative order.
        // Rewrite: new blocks first, then existing.
        const existing = await tx.contentBlock.findMany({
          where: { lessonId: lesson.id },
          orderBy: { order: "asc" },
          select: { id: true }
        });

        for (const [index, row] of existing.entries()) {
          await tx.contentBlock.update({ where: { id: row.id }, data: { order: -5000 - index } });
        }

        let order = 1;
        for (const block of toCreate) {
          // Insert objective/context before steps: create first
          await tx.contentBlock.create({
            data: {
              lessonId: lesson.id,
              type: block.type,
              order: order++,
              content: block.content,
              imagePath: block.imagePath || null,
              imageCaption: block.imageCaption || null,
              settings: serializeBlockSettings(block.settings),
              isVisible: true
            }
          });
        }
        for (const row of existing) {
          await tx.contentBlock.update({ where: { id: row.id }, data: { order: order++ } });
        }

        // Actually re-order so: migrated intro blocks that are objective/context first,
        // then existing steps, then tip/checklist appended after existing if they were tip/checklist
        // Simpler approach already: we created new blocks with order 1..n then existing after.
        // But tip/checklist should often be after steps. Split toCreate into before/after.

        await tx.lesson.update({ where: { id: lesson.id }, data: { blocksMigrated: true } });
      });

      // Better ordering pass: objective, context, existing non-tip, tip/warning, checklist, rest
      await reorderMigratedBlocks(lesson.id);
    }

    blocksCreated += toCreate.length;
    lessonsMigrated += 1;
    details.push({ lessonId: lesson.id, title: lesson.title, created: toCreate.length });
  }

  return {
    ok: true,
    dryRun,
    lessonsScanned: lessons.length,
    lessonsMigrated,
    blocksCreated,
    skipped,
    details
  };
}

async function reorderMigratedBlocks(lessonId: string) {
  const blocks = await prisma.contentBlock.findMany({
    where: { lessonId },
    orderBy: { order: "asc" }
  });

  const score = (b: (typeof blocks)[number]) => {
    const source = parseBlockSettings(b.settings).source;
    if (source === "legacy-objective") return 10;
    if (source === "legacy-context") return 20;
    if (b.type === "STEP" || b.type === "TEXT" || b.type === "HEADING" || b.type === "IMAGE") return 30 + b.order;
    if (source === "legacy-tip" || b.type === "TIP" || b.type === "WARNING" || b.type === "INFO") return 1000;
    if (source === "legacy-checklist" || b.type === "CHECKLIST") return 1100;
    return 500 + b.order;
  };

  const sorted = [...blocks].sort((a, b) => score(a) - score(b));
  await prisma.$transaction([
    ...sorted.map((b, i) => prisma.contentBlock.update({ where: { id: b.id }, data: { order: -3000 - i } })),
    ...sorted.map((b, i) => prisma.contentBlock.update({ where: { id: b.id }, data: { order: i + 1 } }))
  ]);
}

export async function getBlockSummaryLabel(block: LessonBlockDTO) {
  return blockSummary(block);
}
