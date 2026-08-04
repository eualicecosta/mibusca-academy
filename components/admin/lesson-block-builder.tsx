"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CheckSquare,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Heading2,
  ImageIcon,
  Info,
  Lightbulb,
  List,
  ListOrdered,
  Loader2,
  Minus,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Text,
  Trash2,
  Type,
  X
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createLessonQuick } from "@/lib/actions";
import { resolveAssetUrl } from "@/lib/assets";
import { getLessonBlocksAdmin, saveLessonDocument, uploadLessonBlockImage } from "@/lib/lesson-block-actions";
import {
  BLOCK_TYPE_META,
  type LessonBlockDTO,
  type LessonBlockType
} from "@/lib/lesson-blocks";
import { cn } from "@/lib/utils";

function blockImageUrl(path: string | null | undefined, storageBaseUrl: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  // Prefer server-provided base URL (client cannot read R2_PUBLIC_BASE_URL).
  if (storageBaseUrl) return `${storageBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  return resolveAssetUrl(path);
}

type LessonListItem = {
  id: string;
  number: string;
  title: string;
  order: number;
  status: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type LocalBlock = LessonBlockDTO;

const SLASH_TYPES: Array<{ type: LessonBlockType; keywords: string }> = [
  { type: "TEXT", keywords: "texto paragrafo" },
  { type: "HEADING", keywords: "titulo grande heading h2" },
  { type: "SUBHEADING", keywords: "subtitulo h3" },
  { type: "BULLET_LIST", keywords: "lista marcadores bullet" },
  { type: "NUMBERED_LIST", keywords: "lista numerada ordered" },
  { type: "CHECKBOX", keywords: "checkbox item" },
  { type: "CHECKLIST", keywords: "checklist verificacao" },
  { type: "IMAGE", keywords: "imagem foto media" },
  { type: "TIP", keywords: "dica callout" },
  { type: "WARNING", keywords: "atencao aviso warning" },
  { type: "INFO", keywords: "informacao info" },
  { type: "EXAMPLE", keywords: "exemplo pratico" },
  { type: "DIVIDER", keywords: "divisor linha separador" },
  { type: "STEP", keywords: "passo step" }
];

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HEADING: Heading2,
  SUBHEADING: Type,
  TEXT: Text,
  IMAGE: ImageIcon,
  CHECKLIST: CheckSquare,
  CHECKBOX: CheckSquare,
  TIP: Lightbulb,
  WARNING: AlertTriangle,
  INFO: Info,
  EXAMPLE: Sparkles,
  BULLET_LIST: List,
  NUMBERED_LIST: ListOrdered,
  DIVIDER: Minus,
  STEP: ListOrdered
};

function newLocalId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBlock(type: LessonBlockType, order: number, lessonId: string): LocalBlock {
  return {
    id: newLocalId(),
    lessonId,
    type,
    order,
    content: "",
    imagePath: null,
    imageCaption: null,
    isVisible: true,
    settings:
      type === "HEADING" ? { level: 2 } : type === "SUBHEADING" ? { level: 3 } : {}
  };
}

export function LessonBlockBuilder({
  lessons: initialLessons,
  moduleId,
  storageBaseUrl = null
}: {
  moduleId: string;
  lessons: LessonListItem[];
  storageBaseUrl?: string | null;
}) {
  const [lessonList, setLessonList] = useState<LessonListItem[]>(initialLessons);
  const [selectedId, setSelectedId] = useState<string | null>(initialLessons[0]?.id || null);
  const [blocks, setBlocks] = useState<LocalBlock[]>([]);
  const [checklistItems, setChecklistItems] = useState<Array<{ id: string; text: string; order: number }>>([]);
  const [meta, setMeta] = useState<{
    title: string;
    order: number;
    status: string;
    showAutoTitle: boolean;
    number: string;
    blocksMigrated: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createStatus, setCreateStatus] = useState<"DRAFT" | "PUBLISHED" | "HIDDEN">("DRAFT");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    setLessonList(initialLessons);
  }, [initialLessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus((s) => (s === "saving" ? s : "dirty"));
  }, []);

  const loadLesson = useCallback(async (lessonId: string) => {
    setLoading(true);
    setError(null);
    setSaveStatus("idle");
    dirtyRef.current = false;
    try {
      const result = await getLessonBlocksAdmin(lessonId);
      if (!result.ok) {
        setError(result.error);
        setBlocks([]);
        setMeta(null);
        return;
      }
      setBlocks(result.blocks);
      setChecklistItems(result.checklistItems);
      setMeta({
        title: result.lesson.title,
        order: result.lesson.order,
        status: result.lesson.status,
        showAutoTitle: result.lesson.showAutoTitle,
        number: result.lesson.number,
        blocksMigrated: result.lesson.blocksMigrated
      });
      // Never write to the database on open. Migration (if needed) only runs when the user clicks Salvar.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar a aula.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadLesson(selectedId);
  }, [selectedId, loadLesson]);

  const saveAll = useCallback(async () => {
    if (!selectedId || !meta) return;
    if (saveStatus === "saving") return;

    // Immediate visual feedback (before any await).
    const t0 = performance.now();
    setSaveStatus("saving");
    setError(null);

    const saveTraceId = `save_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const payloadBlocks = blocks.map((b, index) => ({
      id: b.id,
      type: b.type,
      order: index + 1,
      content: b.content,
      imagePath: b.imagePath,
      imageCaption: b.imageCaption,
      isVisible: b.isVisible,
      settings: b.settings
    }));
    const payloadChecklist = checklistItems.map(({ id, text }) => ({
      id: id.startsWith("tmp-") || id.startsWith("local-") ? undefined : id,
      text
    }));
    const tPayload = performance.now();
    let payloadBytes = 0;
    try {
      payloadBytes = JSON.stringify({
        lessonId: selectedId,
        blockCount: payloadBlocks.length,
        checklistCount: payloadChecklist.length,
        contentChars: payloadBlocks.reduce((n, b) => n + (b.content?.length || 0), 0)
      }).length;
    } catch {
      payloadBytes = 0;
    }

    const hasImage = payloadBlocks.some((b) => b.type === "IMAGE" && b.imagePath);
    const tRequest = performance.now();

    try {
      const result = await saveLessonDocument({
        lessonId: selectedId,
        title: meta.title,
        order: meta.order,
        status: meta.status as "DRAFT" | "PUBLISHED" | "HIDDEN",
        showAutoTitle: meta.showAutoTitle,
        saveTraceId,
        blocks: payloadBlocks,
        checklistItems: payloadChecklist
      });
      const tResponse = performance.now();

      if (!result.ok) {
        setError(result.error || result.message || "Não foi possível salvar a aula.");
        setSaveStatus("error");
        console.info(
          JSON.stringify({
            event: "lesson_save_client_performance",
            saveTraceId: result.saveTraceId || saveTraceId,
            lessonId: selectedId,
            success: false,
            blockCount: payloadBlocks.length,
            checklistCount: payloadChecklist.length,
            payloadBytesApprox: payloadBytes,
            hasImage,
            fullDocumentSave: true,
            save_click_to_payload_ms: Math.round(tPayload - t0),
            request_ms: Math.round(tResponse - tRequest),
            total_client_ms: Math.round(tResponse - t0),
            serverPerf: result.perf || null
          })
        );
        return;
      }

      // Remap local ids so subsequent saves update instead of recreating.
      const mapped = result.blocks;
      setBlocks(mapped);
      setChecklistItems(result.checklistItems);
      setMeta((m) => (m ? { ...m, blocksMigrated: true } : m));
      setLessonList((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? { ...l, title: meta.title, order: meta.order, status: meta.status }
            : l
        )
      );
      dirtyRef.current = false;
      setSaveStatus("saved");
      const tUi = performance.now();

      console.info(
        JSON.stringify({
          event: "lesson_save_client_performance",
          saveTraceId: result.saveTraceId || saveTraceId,
          lessonId: selectedId,
          success: true,
          blockCount: payloadBlocks.length,
          checklistCount: payloadChecklist.length,
          payloadBytesApprox: payloadBytes,
          hasImage,
          fullDocumentSave: true,
          requestsPerClick: 1,
          save_click_to_ui_ms: Math.round(tPayload - t0),
          payload_ready_ms: Math.round(tPayload - t0),
          request_started_ms: Math.round(tRequest - t0),
          server_response_ms: Math.round(tResponse - tRequest),
          local_state_updated_ms: Math.round(tUi - tResponse),
          total_client_ms: Math.round(tUi - t0),
          serverPerf: result.perf || null
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a aula.");
      setSaveStatus("error");
      console.info(
        JSON.stringify({
          event: "lesson_save_client_performance",
          saveTraceId,
          lessonId: selectedId,
          success: false,
          total_client_ms: Math.round(performance.now() - t0),
          error: "client_exception"
        })
      );
    }
  }, [selectedId, meta, blocks, checklistItems, saveStatus]);

  // Ctrl/Cmd+S only saves when user explicitly presses it (still manual).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirtyRef.current) void saveAll();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll]);

  // Browser tab close / refresh with unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "Você tem alterações não salvas.";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Intercept in-app link clicks (ex: "Voltar para curso") when there are unsaved edits
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      // Same-page anchors ok
      if (href === window.location.pathname + window.location.search) return;
      const ok = window.confirm(
        "Você tem alterações que ainda não foram salvas.\n\nSe sair agora, essas alterações serão perdidas.\n\nDeseja sair sem salvar?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  function ensureTextBlock(): string | null {
    if (!selectedId) return null;
    if (blocks.length > 0) return blocks[0]?.id || null;
    const block = emptyBlock("TEXT", 1, selectedId);
    setBlocks([block]);
    setFocusBlockId(block.id);
    markDirty();
    return block.id;
  }

  function insertBlock(type: LessonBlockType, afterOrder: number | null, transformBlockId?: string) {
    if (!selectedId) return;

    if (transformBlockId) {
      const block = blocks.find((b) => b.id === transformBlockId);
      if (block && (block.type === "TEXT" || !block.content.trim())) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === transformBlockId
              ? {
                  ...b,
                  type,
                  content: type === "DIVIDER" ? "" : b.content,
                  settings:
                    type === "HEADING" ? { level: 2 } : type === "SUBHEADING" ? { level: 3 } : b.settings
                }
              : b
          )
        );
        setFocusBlockId(transformBlockId);
        markDirty();
        if (type === "IMAGE") triggerImageUpload(transformBlockId);
        return;
      }
    }

    setBlocks((prev) => {
      const next = [...prev];
      const idx =
        afterOrder == null ? next.length : next.findIndex((b) => b.order === afterOrder) + 1;
      const at = idx < 0 ? next.length : idx;
      const block = emptyBlock(type, at + 1, selectedId);
      next.splice(at, 0, block);
      setFocusBlockId(block.id);
      if (type === "IMAGE") {
        // upload after state commits
        queueMicrotask(() => triggerImageUpload(block.id));
      }
      return next.map((b, i) => ({ ...b, order: i + 1 }));
    });
    markDirty();
  }

  function triggerImageUpload(blockId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !selectedId) return;
      // Upload file to R2 only — does NOT save the lesson until user clicks Salvar.
      const fd = new FormData();
      fd.set("lessonId", selectedId);
      fd.set("file", file);
      void uploadLessonBlockImage(fd).then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  type: "IMAGE",
                  imagePath: result.path,
                  updatedAt: new Date().toISOString(),
                  // Keep original filename only as alt metadata, never as primary visible content.
                  settings: { ...b.settings, alt: b.settings.alt || "Imagem da aula" }
                }
              : b
          )
        );
        markDirty();
      });
    };
    input.click();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setBlocks(arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i + 1 })));
    markDirty();
  }

  function splitBlock(blockId: string, before: string, after: string) {
    if (!selectedId) return;
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const newType: LessonBlockType =
      block.type === "HEADING" || block.type === "SUBHEADING"
        ? "TEXT"
        : block.type === "CHECKBOX"
          ? "CHECKBOX"
          : "TEXT";

    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx]!, content: before };
      const created = emptyBlock(newType, idx + 2, selectedId);
      created.content = after;
      next.splice(idx + 1, 0, created);
      setFocusBlockId(created.id);
      return next.map((b, i) => ({ ...b, order: i + 1 }));
    });
    markDirty();
  }

  function removeOrMergeBack(blockId: string) {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const block = blocks[idx]!;
    if (blocks.length === 1) {
      setBlocks([{ ...block, content: "" }]);
      markDirty();
      return;
    }
    const prev = blocks[idx - 1];
    if (prev && isTextLike(prev.type) && isTextLike(block.type)) {
      const merged = `${prev.content}${prev.content && block.content ? "\n" : ""}${block.content}`;
      setBlocks((list) =>
        list
          .filter((b) => b.id !== blockId)
          .map((b) => (b.id === prev.id ? { ...b, content: merged } : b))
          .map((b, i) => ({ ...b, order: i + 1 }))
      );
      setFocusBlockId(prev.id);
      markDirty();
      return;
    }
    setBlocks((list) => list.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i + 1 })));
    setFocusBlockId(prev?.id || blocks[idx + 1]?.id || null);
    markDirty();
  }

  function confirmDiscardUnsaved(): boolean {
    if (!dirtyRef.current) return true;
    return window.confirm(
      "Você tem alterações que ainda não foram salvas.\n\nSe sair agora, essas alterações serão perdidas.\n\nDeseja sair sem salvar?"
    );
  }

  function selectLesson(id: string) {
    if (id === selectedId) return;
    if (!confirmDiscardUnsaved()) return;
    setSelectedId(id);
    setMobileListOpen(false);
  }

  async function handleCreateLesson() {
    if (creating) return;
    const title = createTitle.trim();
    if (!title) {
      setCreateError("Informe o título da aula.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createLessonQuick({
        moduleId,
        title,
        status: createStatus
      });
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      const created: LessonListItem = {
        id: result.lesson.id,
        number: result.lesson.number,
        title: result.lesson.title,
        order: result.lesson.order,
        status: result.lesson.status
      };
      setLessonList((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setCreateOpen(false);
      setCreateTitle("");
      setCreateStatus("DRAFT");
      if (!confirmDiscardUnsaved()) {
        // Keep list updated but stay on current lesson if user cancels discard.
        return;
      }
      setSelectedId(created.id);
    } catch {
      setCreateError("Não foi possível criar a aula.");
    } finally {
      setCreating(false);
    }
  }

  const lessonListPanel = (
    <div className="flex h-full min-h-0 flex-col bg-[#121018]">
      <div className="shrink-0 space-y-3 border-b border-white/[0.06] p-3">
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Criar aula
        </Button>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-2">
        {lessonList.map((lesson) => {
          const active = lesson.id === selectedId;
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => selectLesson(lesson.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE]/50",
                  active ? "bg-[#8A1DEE]/18 ring-1 ring-[#8A1DEE]/35" : "hover:bg-white/[0.04]"
                )}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#b07af5]">
                  Aula {lesson.number}
                </span>
                <span className="mt-0.5 block line-clamp-2 text-sm text-white/90">{lesson.title}</span>
              </button>
            </li>
          );
        })}
        {!lessonList.length ? (
          <li className="px-3 py-6 text-center text-xs text-white/40">Nenhuma aula neste módulo.</li>
        ) : null}
      </ul>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden border-t border-white/[0.06] bg-[#0c0a10]">
      {/* Desktop left column */}
      <aside className="hidden h-full min-h-0 w-[260px] shrink-0 border-r border-white/10 md:flex md:w-[240px] lg:w-[280px]">
        {lessonListPanel}
      </aside>

      {/* Mobile lesson list drawer */}
      {mobileListOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar lista de aulas"
            onClick={() => setMobileListOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(88vw,300px)] flex-col border-r border-white/10 bg-[#121018] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3">
              <p className="text-sm font-semibold text-white">Aulas</p>
              <button
                type="button"
                className="rounded-lg p-2 text-white/70 hover:bg-white/10"
                aria-label="Fechar"
                onClick={() => setMobileListOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{lessonListPanel}</div>
          </div>
        </div>
      ) : null}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-md text-sm text-white/55">
              Este módulo ainda não possui aulas. Crie a primeira aula para começar.
            </p>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Criar aula
            </Button>
          </div>
        ) : !meta && !loading ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/45">
            Não foi possível carregar esta aula.
          </div>
        ) : !meta ? (
          <div className="flex flex-1 items-center justify-center text-sm text-white/45">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando documento…
            </span>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#1a1520]">
            {saveStatus === "dirty" || saveStatus === "error" ? (
              <div className="shrink-0 border-b border-amber-400/30 bg-amber-500/15 px-4 py-2 sm:px-6">
                <p className="text-sm font-medium text-amber-100">
                  {saveStatus === "error"
                    ? "Não foi possível salvar. Suas alterações locais foram preservadas — use o botão Salvar para tentar de novo."
                    : "Alterações não salvas — clique em Salvar para gravar."}
                </p>
              </div>
            ) : null}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#121018]/90 px-3 py-2.5 sm:px-5">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-white/45">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-white/70 md:hidden"
                  onClick={() => setMobileListOpen(true)}
                  aria-label="Abrir lista de aulas"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                  Aulas
                </button>
                <span className="font-medium text-white/70">Aula {meta.number}</span>
                <span className="hidden text-white/20 sm:inline">·</span>
                <SaveBadge status={saveStatus} pending={pending} />
                {error ? (
                  <button
                    type="button"
                    className="max-w-[180px] truncate text-red-300/90 underline-offset-2 hover:underline sm:max-w-[240px]"
                    onClick={() => setError(null)}
                    title={error}
                  >
                    {error}
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-white/55 transition hover:bg-white/5 hover:text-white"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Configurações</span>
                </button>
                <button
                  type="button"
                  disabled={saveStatus === "saving" || (saveStatus !== "dirty" && saveStatus !== "error")}
                  onClick={() => startTransition(() => void saveAll())}
                  className={cn(
                    "inline-flex min-w-[7rem] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    saveStatus === "dirty" || saveStatus === "error"
                      ? "bg-gradient-to-r from-[#53009F] to-[#8A1DEE] text-white hover:opacity-95"
                      : "border border-white/10 bg-white/[0.04] text-white/45 disabled:opacity-50"
                  )}
                >
                  {saveStatus === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saveStatus === "saving" ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>

            {settingsOpen ? (
              <div className="shrink-0 border-b border-white/[0.06] bg-[#0f0c14] px-4 py-3 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs text-white/50">
                    Ordem
                    <input
                      type="number"
                      value={meta.order}
                      onChange={(e) => {
                        setMeta({ ...meta, order: Number(e.target.value) || 1 });
                        markDirty();
                      }}
                      className="min-h-9 rounded-lg border border-white/10 bg-black/30 px-2 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-white/50">
                    Status
                    <select
                      value={meta.status}
                      onChange={(e) => {
                        setMeta({ ...meta, status: e.target.value });
                        markDirty();
                      }}
                      className="min-h-9 rounded-lg border border-white/10 bg-black/30 px-2 text-sm text-white"
                    >
                      <option value="PUBLISHED">Publicada</option>
                      <option value="DRAFT">Rascunho</option>
                      <option value="HIDDEN">Oculta</option>
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={meta.showAutoTitle}
                      onChange={(e) => {
                        setMeta({ ...meta, showAutoTitle: e.target.checked });
                        markDirty();
                      }}
                      className="accent-[#8A1DEE]"
                    />
                    Exibir título automático na aula
                  </label>
                </div>
              </div>
            ) : null}

            <div
              className="lesson-editor-canvas min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-6 sm:px-10 sm:py-10 md:px-16"
              onClick={(e) => {
                if (e.target === e.currentTarget && !blocks.length) {
                  ensureTextBlock();
                }
              }}
            >
              <div className="mx-auto w-full max-w-[720px]">
                <input
                  value={meta.title}
                  onChange={(e) => {
                    setMeta({ ...meta, title: e.target.value });
                    markDirty();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (blocks[0]) setFocusBlockId(blocks[0].id);
                      else ensureTextBlock();
                    }
                  }}
                  placeholder="Título da aula"
                  className="mb-8 w-full border-0 bg-transparent p-0 text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-white outline-none placeholder:text-white/25"
                />

                {loading ? (
                  <div className="py-16 text-center text-sm text-white/40">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Carregando blocos…
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {blocks.map((block, index) => (
                          <CanvasBlock
                            key={block.id}
                            block={block}
                            checklistItems={checklistItems}
                            autoFocus={focusBlockId === block.id}
                            onFocused={() => setFocusBlockId(block.id)}
                            onContentChange={(content, settings) => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id ? { ...b, content, settings: settings || b.settings } : b
                                )
                              );
                              markDirty();
                            }}
                            onCaptionChange={(caption) => {
                              setBlocks((prev) =>
                                prev.map((b) => (b.id === block.id ? { ...b, imageCaption: caption } : b))
                              );
                              markDirty();
                            }}
                            onEnterSplit={(before, after) => splitBlock(block.id, before, after)}
                            onBackspaceEmpty={() => removeOrMergeBack(block.id)}
                            onSlashInsert={(type) =>
                              insertBlock(type, index > 0 ? blocks[index - 1]!.order : null, block.id)
                            }
                            onInsertAfter={(type) => insertBlock(type, block.order)}
                            onDuplicate={() => {
                              setBlocks((prev) => {
                                const idx = prev.findIndex((b) => b.id === block.id);
                                if (idx < 0) return prev;
                                const copy: LocalBlock = {
                                  ...block,
                                  id: newLocalId(),
                                  content: block.content
                                };
                                const next = [...prev];
                                next.splice(idx + 1, 0, copy);
                                return next.map((b, i) => ({ ...b, order: i + 1 }));
                              });
                              markDirty();
                            }}
                            onToggleVisible={() => {
                              setBlocks((prev) =>
                                prev.map((b) => (b.id === block.id ? { ...b, isVisible: !b.isVisible } : b))
                              );
                              markDirty();
                            }}
                            onDelete={() => setDeleteTargetId(block.id)}
                            onUploadImage={() => triggerImageUpload(block.id)}
                            onClearImage={() => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? { ...b, imagePath: null, imageCaption: b.imageCaption, updatedAt: new Date().toISOString() }
                                    : b
                                )
                              );
                              markDirty();
                            }}
                            storageBaseUrl={storageBaseUrl}
                            onChangeType={(type) => {
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? {
                                        ...b,
                                        type,
                                        settings:
                                          type === "HEADING"
                                            ? { ...b.settings, level: 2 }
                                            : type === "SUBHEADING"
                                              ? { ...b.settings, level: 3 }
                                              : b.settings
                                      }
                                    : b
                                )
                              );
                              markDirty();
                            }}
                            onChecklistItemsChange={(items) => {
                              setChecklistItems(
                                items.map((item, i) => ({
                                  id: item.id || `tmp-${i}`,
                                  text: item.text,
                                  order: i + 1
                                }))
                              );
                              markDirty();
                            }}
                          />
                        ))}

                        {!blocks.length ? (
                          <button
                            type="button"
                            className="w-full rounded-lg px-1 py-3 text-left text-base text-white/30 transition hover:text-white/50"
                            onClick={() => ensureTextBlock()}
                          >
                            Digite “/” para adicionar um conteúdo ou comece a escrever…
                          </button>
                        ) : null}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (creating) return;
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
            setCreateTitle("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>Criar aula</DialogTitle>
          <p className="text-sm text-white/55">
            Informe o título da nova aula. Você poderá editar o conteúdo em seguida.
          </p>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-white/65">
              Título da aula
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Ex.: Como funciona o funil do iFood"
                className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateLesson();
                  }
                }}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/65">
              Status inicial
              <select
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as "DRAFT" | "PUBLISHED" | "HIDDEN")}
                className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]"
              >
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicada</option>
                <option value="HIDDEN">Oculta</option>
              </select>
            </label>
            {createError ? <p className="text-sm text-red-200">{createError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" disabled={creating} onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={creating || !createTitle.trim()} onClick={() => void handleCreateLesson()}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Criar aula
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Excluir bloco</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja excluir este bloco? Esta ação removerá o conteúdo da aula.
          </AlertDialogDescription>
          {error && deleteTargetId ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button type="button" variant="secondary" disabled={deleting}>
                Cancelar
              </Button>
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !deleteTargetId}
              onClick={() => {
                if (!deleteTargetId || deleting) return;
                setDeleting(true);
                try {
                  setBlocks((prev) =>
                    prev.filter((b) => b.id !== deleteTargetId).map((b, i) => ({ ...b, order: i + 1 }))
                  );
                  markDirty();
                  setDeleteTargetId(null);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Excluindo..." : "Excluir bloco"}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveBadge({ status, pending }: { status: SaveStatus; pending: boolean }) {
  if (status === "saving" || pending) {
    return (
      <span className="inline-flex items-center gap-1 text-white/50">
        <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
      </span>
    );
  }
  if (status === "dirty") return <span className="text-amber-200/80">Alterações não salvas</span>;
  if (status === "saved") return <span className="text-emerald-300/70">Alterações salvas</span>;
  if (status === "error") return <span className="text-red-300">Não foi possível salvar</span>;
  return <span className="text-white/35">Sem alterações</span>;
}

function isTextLike(type: string) {
  return ["TEXT", "HEADING", "SUBHEADING", "TIP", "WARNING", "INFO", "EXAMPLE", "STEP", "CHECKBOX"].includes(type);
}

function CanvasBlock({
  block,
  checklistItems,
  autoFocus,
  storageBaseUrl,
  onFocused,
  onContentChange,
  onCaptionChange,
  onEnterSplit,
  onBackspaceEmpty,
  onSlashInsert,
  onInsertAfter,
  onDuplicate,
  onToggleVisible,
  onDelete,
  onUploadImage,
  onClearImage,
  onChangeType,
  onChecklistItemsChange
}: {
  block: LocalBlock;
  checklistItems: Array<{ id: string; text: string; order: number }>;
  autoFocus?: boolean;
  storageBaseUrl: string | null;
  onFocused: () => void;
  onContentChange: (content: string, settings?: LessonBlockDTO["settings"]) => void;
  onCaptionChange: (caption: string) => void;
  onEnterSplit: (before: string, after: string) => void;
  onBackspaceEmpty: () => void;
  onSlashInsert: (type: LessonBlockType) => void;
  onInsertAfter: (type: LessonBlockType) => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  onUploadImage: () => void;
  onClearImage: () => void;
  onChangeType: (type: LessonBlockType) => void;
  onChecklistItemsChange: (items: Array<{ id?: string; text: string }>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [slash, setSlash] = useState<{ query: string; open: boolean } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const editableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImageFailed(false);
  }, [block.imagePath]);

  const filteredSlash = SLASH_TYPES.filter((item) => {
    if (!slash?.query) return true;
    const q = slash.query.toLowerCase();
    const label = BLOCK_TYPE_META[item.type]?.label.toLowerCase() || "";
    return label.includes(q) || item.keywords.includes(q);
  });

  useEffect(() => {
    if (autoFocus && editableRef.current) {
      editableRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = block.content || "";
    if (el.innerText !== next) el.innerText = next;
  }, [block.content, block.id]);

  const placeholder = placeholderFor(block.type);

  function handleInput() {
    const el = editableRef.current;
    if (!el) return;
    const text = el.innerText.replace(/\u00a0/g, " ");
    const lines = text.split("\n");
    const last = lines[lines.length - 1] || "";
    const match = last.match(/^\/([^\n]*)$/);
    if (match) {
      setSlash({ open: true, query: match[1] || "" });
      setSlashIndex(0);
    } else {
      setSlash(null);
    }
    onContentChange(text);
  }

  function applySlash(type: LessonBlockType) {
    const el = editableRef.current;
    if (el) {
      const text = el.innerText.replace(/\u00a0/g, " ");
      const cleaned = text.replace(/(?:^|\n)\/[^\n]*$/, "").replace(/\n$/, "");
      el.innerText = cleaned;
      onContentChange(cleaned);
    }
    setSlash(null);
    onSlashInsert(type);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (slash?.open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, Math.max(filteredSlash.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredSlash[slashIndex];
        if (item) applySlash(item.type);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (block.type === "BULLET_LIST" || block.type === "NUMBERED_LIST" || block.type === "CHECKLIST") {
        return;
      }
      e.preventDefault();
      const el = editableRef.current;
      if (!el) return;
      const text = el.innerText.replace(/\u00a0/g, " ");
      const sel = window.getSelection();
      let before = text;
      let after = "";
      if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const pre = range.cloneRange();
        pre.selectNodeContents(el);
        pre.setEnd(range.endContainer, range.endOffset);
        before = pre.toString();
        const post = range.cloneRange();
        post.selectNodeContents(el);
        post.setStart(range.endContainer, range.endOffset);
        after = post.toString();
      }
      el.innerText = before;
      onEnterSplit(before, after);
      return;
    }

    if (e.key === "Backspace") {
      const el = editableRef.current;
      const text = (el?.innerText || "").replace(/\u00a0/g, " ").trim();
      if (!text) {
        e.preventDefault();
        onBackspaceEmpty();
      }
    }
  }

  const imageUrl = blockImageUrl(block.imagePath, storageBaseUrl);
  // Bust stale browser cache after replace/upload while keeping stable path in DB.
  const imageSrc =
    imageUrl && block.updatedAt
      ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(block.updatedAt)}`
      : imageUrl
        ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(block.imagePath || "")}`
        : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg transition",
        !block.isVisible && "opacity-50",
        isDragging && "z-20 bg-[#8A1DEE]/10 ring-1 ring-[#8A1DEE]/30"
      )}
      onMouseDown={onFocused}
    >
      <div className="absolute -left-10 top-1 hidden items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 sm:flex">
        <button
          type="button"
          className="rounded p-0.5 text-white/35 hover:bg-white/10 hover:text-white"
          title="Inserir"
          onClick={() => onInsertAfter("TEXT")}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="cursor-grab rounded p-0.5 text-white/35 hover:bg-white/10 hover:text-white active:cursor-grabbing"
          title="Arrastar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative flex min-w-0 items-start gap-2 py-1">
        {block.type === "CHECKBOX" ? (
          <span className="mt-2 h-4 w-4 shrink-0 rounded border border-white/30" aria-hidden />
        ) : null}

        {block.type === "DIVIDER" ? (
          <hr className="my-4 w-full border-0 border-t border-white/15" />
        ) : block.type === "IMAGE" ? (
          <div className="w-full space-y-2">
            {imageSrc && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt={block.settings.alt || block.imageCaption || "Imagem da aula"}
                className="mx-auto max-h-[420px] w-full max-w-full rounded-lg object-contain"
                onError={() => setImageFailed(true)}
                onLoad={() => setImageFailed(false)}
              />
            ) : imageSrc && imageFailed ? (
              <div className="space-y-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-6 text-center">
                <p className="text-sm text-red-100">Não foi possível carregar esta imagem.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                    onClick={() => setImageFailed(false)}
                  >
                    Tentar novamente
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                    onClick={onUploadImage}
                  >
                    Substituir
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/10"
                    onClick={onClearImage}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onUploadImage}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] py-10 text-sm text-white/45 hover:border-[#8A1DEE]/40 hover:text-white/70"
              >
                <ImageIcon className="h-4 w-4" />
                Clique para enviar imagem
              </button>
            )}
            <input
              value={block.imageCaption || ""}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Legenda (opcional)"
              className="w-full border-0 bg-transparent text-center text-sm text-white/50 outline-none placeholder:text-white/25"
            />
            <div className="flex justify-center gap-3 opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={onUploadImage} className="text-xs text-white/45 hover:text-white">
                Substituir
              </button>
              {block.imagePath ? (
                <button type="button" onClick={onClearImage} className="text-xs text-red-300/80 hover:text-red-200">
                  Remover imagem
                </button>
              ) : null}
            </div>
          </div>
        ) : block.type === "CHECKLIST" ? (
          <div className="w-full space-y-2">
            <EditableLine
              ref={editableRef}
              className="text-base font-semibold text-white"
              data-placeholder="Título do checklist"
              onInput={handleInput}
              onKeyDown={onKeyDown}
              onFocus={onFocused}
            />
            <div className="space-y-1.5 pl-1">
              {checklistItems.map((item, index) => (
                <div key={item.id || `item-${index}`} className="flex items-start gap-2">
                  <span className="mt-1.5 h-4 w-4 shrink-0 rounded border border-white/30" />
                  <input
                    value={item.text}
                    onChange={(e) => {
                      const next = checklistItems.map((it, i) =>
                        i === index ? { id: it.id, text: e.target.value } : { id: it.id, text: it.text }
                      );
                      onChecklistItemsChange(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const next: Array<{ id?: string; text: string }> = checklistItems.map(
                          ({ id, text }) => ({ id, text })
                        );
                        next.splice(index + 1, 0, { text: "" });
                        onChecklistItemsChange(next);
                      }
                    }}
                    className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] text-white/80 outline-none placeholder:text-white/25"
                    placeholder="Item da checklist"
                  />
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-white/40 hover:text-white/70"
                onClick={() =>
                  onChecklistItemsChange([...checklistItems.map(({ id, text }) => ({ id, text })), { text: "" }])
                }
              >
                + item
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative min-w-0 flex-1",
              (block.type === "TIP" ||
                block.type === "WARNING" ||
                block.type === "INFO" ||
                block.type === "EXAMPLE") &&
                "rounded-r-lg border-l-[3px] border-l-[#8A1DEE] bg-[#8A1DEE]/[0.06] px-3 py-2",
              block.type === "WARNING" && "border-l-amber-400/80 bg-amber-400/[0.06]",
              block.type === "INFO" && "border-l-sky-400/70 bg-sky-400/[0.06]",
              block.type === "EXAMPLE" && "border-l-emerald-400/70 bg-emerald-400/[0.06]"
            )}
          >
            {(block.type === "TIP" ||
              block.type === "WARNING" ||
              block.type === "INFO" ||
              block.type === "EXAMPLE") && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                {BLOCK_TYPE_META[block.type as LessonBlockType]?.label || block.type}
              </p>
            )}
            <EditableLine
              ref={editableRef}
              className={cn(
                "w-full whitespace-pre-wrap break-words text-[15px] leading-[1.75] text-white/85 outline-none",
                (block.type === "HEADING" || (block.type === "SUBHEADING" && block.settings.level !== 3)) &&
                  "text-xl font-semibold text-white sm:text-2xl",
                block.type === "SUBHEADING" && block.settings.level === 3 && "text-lg font-semibold text-white"
              )}
              data-placeholder={placeholder}
              onInput={handleInput}
              onKeyDown={onKeyDown}
              onFocus={onFocused}
            />
          </div>
        )}

        <div className="absolute -right-1 top-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            className="rounded-md p-1 text-white/35 hover:bg-white/10 hover:text-white"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu do bloco"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl">
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onChangeType("HEADING");
                }}
              >
                Transformar em título
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onChangeType("TEXT");
                }}
              >
                Transformar em texto
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onToggleVisible();
                }}
              >
                {block.isVisible ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Exibir
                  </>
                )}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                danger
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </MenuItem>
            </div>
          ) : null}
        </div>
      </div>

      {slash?.open ? (
        <div className="absolute left-0 z-40 mt-1 w-[min(100%,280px)] overflow-hidden rounded-xl border border-white/10 bg-[#151019] shadow-2xl">
          <p className="border-b border-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Inserir bloco
          </p>
          <ul className="max-h-64 overflow-y-auto p-1">
            {filteredSlash.map((item, index) => {
              const Icon = TYPE_ICONS[item.type] || Text;
              const active = index === slashIndex;
              return (
                <li key={item.type}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                      active ? "bg-[#8A1DEE]/25 text-white" : "text-white/75 hover:bg-white/5"
                    )}
                    onMouseEnter={() => setSlashIndex(index)}
                    onClick={() => applySlash(item.type)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#b07af5]" />
                    <span>{BLOCK_TYPE_META[item.type]?.label || item.type}</span>
                  </button>
                </li>
              );
            })}
            {!filteredSlash.length ? (
              <li className="px-3 py-4 text-center text-xs text-white/40">Nenhum resultado</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const EditableLine = ({
  ref,
  className,
  onInput,
  onKeyDown,
  onFocus,
  "data-placeholder": dataPlaceholder
}: {
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
  onInput?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onFocus?: () => void;
  "data-placeholder"?: string;
}) => (
  <div
    ref={ref}
    contentEditable
    suppressContentEditableWarning
    role="textbox"
    aria-multiline
    data-placeholder={dataPlaceholder}
    className={cn(
      "empty:before:pointer-events-none empty:before:text-white/25 empty:before:content-[attr(data-placeholder)]",
      className
    )}
    onInput={onInput}
    onKeyDown={onKeyDown}
    onFocus={onFocus}
  />
);

function MenuItem({
  children,
  onClick,
  danger
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition",
        danger ? "text-red-300 hover:bg-red-500/10" : "text-white/75 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function placeholderFor(type: string) {
  switch (type) {
    case "HEADING":
      return "Título";
    case "SUBHEADING":
      return "Subtítulo";
    case "TIP":
      return "Escreva a dica…";
    case "WARNING":
      return "Escreva o aviso…";
    case "INFO":
      return "Informação…";
    case "EXAMPLE":
      return "Exemplo prático…";
    case "BULLET_LIST":
      return "Item da lista (um por linha)";
    case "NUMBERED_LIST":
      return "Item numerado (um por linha)";
    case "CHECKBOX":
      return "Item a marcar";
    case "STEP":
      return "Descreva o passo…";
    default:
      return "Digite “/” para comandos, ou comece a escrever…";
  }
}
