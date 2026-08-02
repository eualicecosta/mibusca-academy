import type { ContentBlockType } from "@prisma/client";

export const LESSON_BLOCK_TYPES = [
  "HEADING",
  "SUBHEADING",
  "TEXT",
  "IMAGE",
  "CHECKLIST",
  "CHECKBOX",
  "TIP",
  "WARNING",
  "INFO",
  "EXAMPLE",
  "BULLET_LIST",
  "NUMBERED_LIST",
  "DIVIDER",
  "STEP"
] as const satisfies readonly ContentBlockType[];

export type LessonBlockType = (typeof LESSON_BLOCK_TYPES)[number];

export type BlockSettings = {
  level?: 2 | 3;
  align?: "left" | "center" | "right";
  title?: string;
  alt?: string;
  width?: "sm" | "md" | "lg" | "full";
  required?: boolean;
  items?: string[];
  checklistItemId?: string;
  /** Marks auto-migrated legacy content (idempotency aid). */
  source?: string;
};

export type LessonBlockDTO = {
  id: string;
  lessonId: string;
  type: ContentBlockType;
  order: number;
  content: string;
  imagePath: string | null;
  imageCaption: string | null;
  isVisible: boolean;
  settings: BlockSettings;
  createdAt?: string;
  updatedAt?: string;
};

export const BLOCK_TYPE_META: Record<
  LessonBlockType,
  { label: string; description: string; group: "structure" | "media" | "interactive" | "callout" | "legacy" }
> = {
  HEADING: { label: "Título", description: "Título de seção (H2/H3)", group: "structure" },
  SUBHEADING: { label: "Subtítulo", description: "Subtítulo de seção", group: "structure" },
  TEXT: { label: "Texto", description: "Parágrafo ou texto corrido", group: "structure" },
  IMAGE: { label: "Imagem", description: "Imagem com legenda", group: "media" },
  CHECKLIST: { label: "Checklist", description: "Lista de verificação da aula", group: "interactive" },
  CHECKBOX: { label: "Checkbox", description: "Item individual de verificação", group: "interactive" },
  TIP: { label: "Dica", description: "Callout de dica", group: "callout" },
  WARNING: { label: "Atenção", description: "Callout de aviso", group: "callout" },
  INFO: { label: "Informação", description: "Callout informativo", group: "callout" },
  EXAMPLE: { label: "Exemplo prático", description: "Callout de exemplo", group: "callout" },
  BULLET_LIST: { label: "Lista com marcadores", description: "Lista não numerada", group: "structure" },
  NUMBERED_LIST: { label: "Lista numerada", description: "Lista ordenada", group: "structure" },
  DIVIDER: { label: "Divisor", description: "Separador visual", group: "structure" },
  STEP: { label: "Passo", description: "Passo legado numerado", group: "legacy" }
};

export function isLessonBlockType(value: string): value is LessonBlockType {
  return (LESSON_BLOCK_TYPES as readonly string[]).includes(value);
}

export function parseBlockSettings(raw: string | null | undefined): BlockSettings {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return sanitizeSettings(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function serializeBlockSettings(settings: BlockSettings | null | undefined): string | null {
  if (!settings || Object.keys(settings).length === 0) return null;
  return JSON.stringify(sanitizeSettings(settings as Record<string, unknown>));
}

function sanitizeSettings(input: Record<string, unknown>): BlockSettings {
  const out: BlockSettings = {};

  if (input.level === 2 || input.level === 3) out.level = input.level;
  if (input.align === "left" || input.align === "center" || input.align === "right") out.align = input.align;
  if (typeof input.title === "string") out.title = input.title.slice(0, 200);
  if (typeof input.alt === "string") out.alt = input.alt.slice(0, 300);
  if (input.width === "sm" || input.width === "md" || input.width === "lg" || input.width === "full") {
    out.width = input.width;
  }
  if (typeof input.required === "boolean") out.required = input.required;
  if (typeof input.checklistItemId === "string" && input.checklistItemId.length <= 64) {
    out.checklistItemId = input.checklistItemId;
  }
  if (typeof input.source === "string" && input.source.length <= 80) {
    out.source = input.source;
  }
  if (Array.isArray(input.items)) {
    out.items = input.items
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 500))
      .filter(Boolean)
      .slice(0, 50);
  }

  return out;
}

export function validateBlockInput(input: {
  type: string;
  content?: string;
  imagePath?: string | null;
  imageCaption?: string | null;
  settings?: BlockSettings | null;
}): { ok: true; type: LessonBlockType; content: string; settings: BlockSettings } | { ok: false; error: string } {
  if (!isLessonBlockType(input.type)) {
    return { ok: false, error: "Tipo de bloco inválido." };
  }

  const type = input.type;
  const content = String(input.content || "").trim();
  const settings = sanitizeSettings((input.settings || {}) as Record<string, unknown>);

  switch (type) {
    case "DIVIDER":
      return { ok: true, type, content: "", settings };
    case "HEADING":
    case "SUBHEADING":
      if (!content) return { ok: false, error: "Informe o texto do título." };
      if (!settings.level) settings.level = type === "HEADING" ? 2 : 3;
      return { ok: true, type, content: content.slice(0, 300), settings };
    case "TEXT":
    case "STEP":
    case "TIP":
    case "WARNING":
    case "INFO":
    case "EXAMPLE":
    case "CHECKBOX":
      if (!content) return { ok: false, error: "Informe o conteúdo do bloco." };
      return { ok: true, type, content: content.slice(0, 20000), settings };
    case "BULLET_LIST":
    case "NUMBERED_LIST": {
      const items =
        settings.items && settings.items.length
          ? settings.items
          : content
              .split("\n")
              .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
              .filter(Boolean);
      if (!items.length) return { ok: false, error: "Adicione ao menos um item na lista." };
      settings.items = items;
      return { ok: true, type, content: items.join("\n"), settings };
    }
    case "IMAGE":
      if (!input.imagePath && !content) {
        // imagePath may be set after upload; allow empty content with caption/alt only if path present later
      }
      return {
        ok: true,
        type,
        content: content.slice(0, 500),
        settings
      };
    case "CHECKLIST":
      return { ok: true, type, content: content.slice(0, 200), settings };
    default:
      return { ok: false, error: "Tipo de bloco não suportado." };
  }
}

export function blockSummary(block: {
  type: ContentBlockType;
  content: string;
  imageCaption?: string | null;
  settings?: BlockSettings | null;
}): string {
  const settings = block.settings || {};
  if (block.type === "DIVIDER") return "Separador visual";
  if (block.type === "IMAGE") return block.imageCaption || settings.alt || "Imagem";
  if (block.type === "BULLET_LIST" || block.type === "NUMBERED_LIST") {
    const count = settings.items?.length || block.content.split("\n").filter(Boolean).length;
    return `${count} item(ns)`;
  }
  if (block.type === "CHECKLIST") return settings.title || block.content || "Checklist da aula";
  const text = block.content.replace(/\s+/g, " ").trim();
  if (!text) return "Sem conteúdo";
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

export function listItemsFromBlock(content: string, settings?: BlockSettings): string[] {
  if (settings?.items?.length) return settings.items;
  return content
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}
