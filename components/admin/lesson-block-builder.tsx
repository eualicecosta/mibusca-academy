"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
  ChevronDown,
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
  Plus,
  Save,
  Sparkles,
  Text,
  Trash2,
  Type
} from "lucide-react";
import { LessonBlockRenderer } from "@/components/lesson/lesson-block-renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  createLessonBlock,
  deleteLessonBlock,
  duplicateLessonBlock,
  getLessonBlocksAdmin,
  migrateLegacyLessonContent,
  reorderLessonBlocks,
  toggleLessonBlockVisibility,
  updateLessonBlock,
  updateLessonMeta,
  uploadLessonBlockImage
} from "@/lib/lesson-block-actions";
import {
  BLOCK_TYPE_META,
  blockSummary,
  type LessonBlockDTO,
  type LessonBlockType
} from "@/lib/lesson-blocks";
import { cn } from "@/lib/utils";

type LessonListItem = {
  id: string;
  number: string;
  title: string;
  order: number;
  status: string;
  completedCount: number;
};

const ADDABLE_TYPES: LessonBlockType[] = [
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

export function LessonBlockBuilder({
  lessons
}: {
  moduleId?: string;
  lessons: LessonListItem[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(lessons[0]?.id || null);
  const [blocks, setBlocks] = useState<LessonBlockDTO[]>([]);
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [insertAfterOrder, setInsertAfterOrder] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadLesson = useCallback(async (lessonId: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setEditingId(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar a aula.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadLesson(selectedId);
  }, [selectedId, loadLesson]);

  const selectedLesson = lessons.find((l) => l.id === selectedId) || null;

  function openAddMenu(afterOrder: number | null = null) {
    setInsertAfterOrder(afterOrder);
    setAddMenuOpen(true);
  }

  function handleAddType(type: LessonBlockType) {
    if (!selectedId) return;
    setAddMenuOpen(false);
    startTransition(async () => {
      setError(null);
      const result = await createLessonBlock({
        lessonId: selectedId,
        type,
        afterOrder: insertAfterOrder
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBlocks((prev) => {
        const next = [...prev];
        const idx =
          insertAfterOrder == null
            ? next.length
            : next.findIndex((b) => b.order === insertAfterOrder) + 1;
        const at = idx < 0 ? next.length : idx;
        next.splice(at, 0, result.block);
        return next.map((b, i) => ({ ...b, order: i + 1 }));
      });
      setEditingId(result.block.id);
      setMessage("Bloco adicionado.");
      await loadLesson(selectedId);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedId) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = blocks;
    const next = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i + 1 }));
    setBlocks(next);
    startTransition(async () => {
      const result = await reorderLessonBlocks(
        selectedId,
        next.map((b) => b.id)
      );
      if (!result.ok) {
        setBlocks(previous);
        setError(result.error);
        return;
      }
      setBlocks(result.blocks);
      setMessage("Ordem salva.");
    });
  }

  async function handleSaveMeta() {
    if (!selectedId || !meta) return;
    startTransition(async () => {
      const result = await updateLessonMeta({
        lessonId: selectedId,
        title: meta.title,
        order: meta.order,
        status: meta.status as "DRAFT" | "PUBLISHED" | "HIDDEN",
        showAutoTitle: meta.showAutoTitle
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Dados da aula salvos.");
    });
  }

  async function handleMigrate(dryRun: boolean) {
    startTransition(async () => {
      const result = await migrateLegacyLessonContent({ dryRun, lessonId: selectedId || undefined });
      setMessage(
        dryRun
          ? `Dry-run: ${result.lessonsScanned} aulas, ${result.blocksCreated} blocos seriam criados, ${result.skipped} ignoradas.`
          : `Migração: ${result.lessonsMigrated} aulas, ${result.blocksCreated} blocos criados.`
      );
      if (!dryRun && selectedId) await loadLesson(selectedId);
    });
  }

  return (
    <div className="grid min-h-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      {/* Lesson list */}
      <aside className="rounded-xl border border-white/10 bg-[#151019]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-white">Aulas do módulo</p>
          <p className="mt-0.5 text-xs text-white/45">Selecione uma aula para editar os blocos</p>
        </div>
        <ul className="max-h-[min(70vh,640px)] space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
          {lessons.map((lesson) => {
            const active = lesson.id === selectedId;
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(lesson.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition",
                    active ? "bg-[#8A1DEE]/20 ring-1 ring-[#8A1DEE]/40" : "hover:bg-white/[0.04]"
                  )}
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#b07af5]">
                    Aula {lesson.number} · {lesson.status}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-sm font-medium text-white/90">{lesson.title}</span>
                  <span className="mt-1 block text-xs text-white/40">{lesson.completedCount} conclusões</span>
                </button>
              </li>
            );
          })}
          {!lessons.length ? (
            <li className="px-3 py-6 text-center text-sm text-white/45">Nenhuma aula neste módulo.</li>
          ) : null}
        </ul>
      </aside>

      {/* Editor */}
      <section className="min-w-0 space-y-4">
        {!selectedLesson || !meta ? (
          <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-white/45">
            {loading ? "Carregando aula…" : "Selecione uma aula na lista ao lado."}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-white/10 bg-[#151019] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#8A1DEE]">Dados gerais</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Aula {meta.number}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                    <Eye className="h-4 w-4" />
                    Visualizar como aluno
                  </Button>
                  <Button type="button" size="sm" onClick={() => void handleSaveMeta()} disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar dados
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_100px_140px]">
                <label className="grid gap-1.5 text-xs font-semibold text-white/55">
                  Título cadastral
                  <input
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                    className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-white/55">
                  Ordem
                  <input
                    type="number"
                    value={meta.order}
                    onChange={(e) => setMeta({ ...meta, order: Number(e.target.value) || 1 })}
                    className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-white/55">
                  Status
                  <select
                    value={meta.status}
                    onChange={(e) => setMeta({ ...meta, status: e.target.value })}
                    className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={meta.showAutoTitle}
                  onChange={(e) => setMeta({ ...meta, showAutoTitle: e.target.checked })}
                  className="h-4 w-4 accent-[#8A1DEE]"
                />
                Exibir título automático na aula
              </label>

              {!meta.blocksMigrated ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-100">
                  <span className="flex-1">Conteúdo legado ainda não migrado para blocos.</span>
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void handleMigrate(true)}>
                    Dry-run
                  </Button>
                  <Button type="button" size="sm" disabled={pending} onClick={() => void handleMigrate(false)}>
                    Migrar agora
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#151019] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Conteúdo da aula</h3>
                  <p className="mt-0.5 text-sm text-white/45">Blocos ordenáveis · {blocks.length} no total</p>
                </div>
                <Button type="button" onClick={() => openAddMenu(null)} disabled={pending || loading}>
                  <Plus className="h-4 w-4" />
                  Adicionar bloco
                </Button>
              </div>

              {error ? (
                <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
              ) : null}
              {message ? (
                <p className="mb-3 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  {message}
                </p>
              ) : null}

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando blocos…
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {blocks.map((block, index) => (
                        <div key={block.id}>
                          {index > 0 ? (
                            <div className="flex justify-center py-1">
                              <button
                                type="button"
                                onClick={() => openAddMenu(blocks[index - 1]?.order ?? null)}
                                className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-white/40 transition hover:border-[#8A1DEE]/40 hover:text-white/80"
                                title="Inserir bloco aqui"
                              >
                                <Plus className="inline h-3 w-3" />
                              </button>
                            </div>
                          ) : null}
                          <SortableBlockRow
                            block={block}
                            expanded={editingId === block.id}
                            checklistItems={checklistItems}
                            pending={pending}
                            onToggleExpand={() => setEditingId(editingId === block.id ? null : block.id)}
                            onToggleVisible={() => {
                              startTransition(async () => {
                                const result = await toggleLessonBlockVisibility(block.id);
                                if (!result.ok) {
                                  setError(result.error);
                                  return;
                                }
                                setBlocks((prev) => prev.map((b) => (b.id === block.id ? result.block : b)));
                              });
                            }}
                            onDuplicate={() => {
                              startTransition(async () => {
                                const result = await duplicateLessonBlock(block.id);
                                if (!result.ok) {
                                  setError(result.error);
                                  return;
                                }
                                if (selectedId) await loadLesson(selectedId);
                                setEditingId(result.block.id);
                              });
                            }}
                            onDelete={() => {
                              const needsConfirm =
                                block.type === "CHECKLIST" || block.type === "CHECKBOX"
                                  ? window.confirm(
                                      "Excluir este bloco pode afetar progresso de alunos em checkboxes. Continuar?"
                                    )
                                  : window.confirm("Excluir este bloco permanentemente?");
                              if (!needsConfirm) return;
                              startTransition(async () => {
                                const result = await deleteLessonBlock(block.id, { confirmProgressLoss: true });
                                if (!result.ok) {
                                  setError(result.error);
                                  return;
                                }
                                setBlocks((prev) => prev.filter((b) => b.id !== block.id));
                                if (editingId === block.id) setEditingId(null);
                              });
                            }}
                            onSave={async (payload) => {
                              const result = await updateLessonBlock({ blockId: block.id, ...payload });
                              if (!result.ok) {
                                setError(result.error);
                                return false;
                              }
                              setBlocks((prev) => prev.map((b) => (b.id === block.id ? result.block : b)));
                              if (selectedId) await loadLesson(selectedId);
                              setMessage("Bloco salvo.");
                              return true;
                            }}
                            onUploadImage={async (file) => {
                              const fd = new FormData();
                              fd.set("blockId", block.id);
                              fd.set("file", file);
                              const result = await uploadLessonBlockImage(fd);
                              if (!result.ok) {
                                setError(result.error);
                                return null;
                              }
                              if (result.block) {
                                setBlocks((prev) => prev.map((b) => (b.id === block.id ? result.block! : b)));
                              }
                              return result.path;
                            }}
                          />
                        </div>
                      ))}

                      {!blocks.length ? (
                        <div className="rounded-lg border border-dashed border-white/10 px-4 py-12 text-center">
                          <p className="text-sm text-white/50">Nenhum bloco ainda. Comece adicionando conteúdo.</p>
                          <Button type="button" className="mt-4" onClick={() => openAddMenu(null)}>
                            <Plus className="h-4 w-4" />
                            Adicionar bloco
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-center pt-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openAddMenu(blocks[blocks.length - 1]?.order ?? null)}>
                            <Plus className="h-4 w-4" />
                            Adicionar ao final
                          </Button>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </>
        )}
      </section>

      {/* Add block dialog */}
      <Dialog open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Adicionar bloco</DialogTitle>
          <p className="text-sm text-white/55">Escolha o tipo de conteúdo a inserir.</p>
          <div className="mt-2 grid max-h-[min(60vh,420px)] gap-2 overflow-y-auto pr-1">
            {ADDABLE_TYPES.map((type) => {
              const metaType = BLOCK_TYPE_META[type];
              const Icon = TYPE_ICONS[type] || Text;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddType(type)}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-[#8A1DEE]/40 hover:bg-[#8A1DEE]/10"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#b07af5]" />
                  <span>
                    <span className="block text-sm font-semibold text-white">{metaType.label}</span>
                    <span className="mt-0.5 block text-xs text-white/50">{metaType.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Student preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[min(92dvh,900px)] max-w-3xl overflow-y-auto">
          <DialogTitle>Pré-visualização · aluno</DialogTitle>
          <p className="text-sm text-white/50">Somente leitura — não altera progresso.</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0c0a10] p-5 sm:p-8">
            {meta?.showAutoTitle ? (
              <header className="mb-8 space-y-2 border-b border-white/[0.08] pb-6">
                <p className="text-xs text-white/45">Aula {meta.number}</p>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{meta.title}</h1>
              </header>
            ) : null}
            <LessonBlockRenderer
              blocks={blocks}
              checklistItems={checklistItems}
              checkedIds={[]}
              mode="preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableBlockRow({
  block,
  expanded,
  checklistItems,
  pending,
  onToggleExpand,
  onToggleVisible,
  onDuplicate,
  onDelete,
  onSave,
  onUploadImage
}: {
  block: LessonBlockDTO;
  expanded: boolean;
  checklistItems: Array<{ id: string; text: string; order: number }>;
  pending: boolean;
  onToggleExpand: () => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: (payload: {
    content?: string;
    imageCaption?: string | null;
    settings?: LessonBlockDTO["settings"];
    checklistItems?: Array<{ id?: string; text: string }>;
  }) => Promise<boolean>;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1
  };

  const typeMeta = BLOCK_TYPE_META[block.type as LessonBlockType] || {
    label: block.type,
    description: ""
  };
  const Icon = TYPE_ICONS[block.type] || Text;

  const [content, setContent] = useState(block.content);
  const [caption, setCaption] = useState(block.imageCaption || "");
  const [title, setTitle] = useState(block.settings.title || "");
  const [level, setLevel] = useState<2 | 3>(block.settings.level || 2);
  const [width, setWidth] = useState(block.settings.width || "full");
  const [listText, setListText] = useState(
    (block.settings.items || block.content.split("\n")).filter(Boolean).join("\n")
  );
  const [items, setItems] = useState<Array<{ id?: string; text: string }>>(
    checklistItems.map((i) => ({ id: i.id, text: i.text }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expanded) {
      setContent(block.content);
      setCaption(block.imageCaption || "");
      setTitle(block.settings.title || "");
      setLevel(block.settings.level || 2);
      setWidth(block.settings.width || "full");
      setListText((block.settings.items || block.content.split("\n")).filter(Boolean).join("\n"));
      setItems(checklistItems.map((i) => ({ id: i.id, text: i.text })));
    }
  }, [expanded, block, checklistItems]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02]",
        !block.isVisible && "opacity-60",
        isDragging && "z-10 shadow-xl ring-1 ring-[#8A1DEE]/40"
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          className="mt-1 cursor-grab rounded p-1 text-white/40 hover:bg-white/5 hover:text-white active:cursor-grabbing"
          aria-label="Arrastar bloco"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button type="button" onClick={onToggleExpand} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-[#b07af5]" />
            <span className="text-sm font-semibold text-white">{typeMeta.label}</span>
            {!block.isVisible ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/55">
                Oculto
              </span>
            ) : null}
            <ChevronDown className={cn("ml-auto h-4 w-4 text-white/40 transition", expanded && "rotate-180")} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-white/45">{blockSummary(block)}</p>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            title={block.isVisible ? "Ocultar" : "Exibir"}
            onClick={onToggleVisible}
            disabled={pending}
            className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
          >
            {block.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            title="Duplicar"
            onClick={onDuplicate}
            disabled={pending}
            className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Excluir"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg p-2 text-red-300/70 hover:bg-red-500/10 hover:text-red-200"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-white/10 p-3 sm:p-4">
          {(block.type === "HEADING" || block.type === "SUBHEADING") && (
            <>
              <Field label="Texto">
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={fieldClass}
                />
              </Field>
              <Field label="Nível">
                <select value={level} onChange={(e) => setLevel(Number(e.target.value) as 2 | 3)} className={fieldClass}>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                </select>
              </Field>
            </>
          )}

          {(block.type === "TEXT" ||
            block.type === "STEP" ||
            block.type === "TIP" ||
            block.type === "WARNING" ||
            block.type === "INFO" ||
            block.type === "EXAMPLE" ||
            block.type === "CHECKBOX") && (
            <>
              {(block.type === "TIP" ||
                block.type === "WARNING" ||
                block.type === "INFO" ||
                block.type === "EXAMPLE") && (
                <Field label="Título do callout (opcional)">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
                </Field>
              )}
              <Field label="Conteúdo">
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className={fieldClass} />
              </Field>
            </>
          )}

          {(block.type === "BULLET_LIST" || block.type === "NUMBERED_LIST") && (
            <Field label="Itens (um por linha)">
              <textarea value={listText} onChange={(e) => setListText(e.target.value)} rows={6} className={fieldClass} />
            </Field>
          )}

          {block.type === "IMAGE" && (
            <>
              <Field label="Upload de imagem">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadImage(file);
                  }}
                  className={cn(fieldClass, "text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#8A1DEE] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white")}
                />
              </Field>
              {block.imagePath ? (
                <p className="break-all text-xs text-white/45">Arquivo: {block.imagePath}</p>
              ) : (
                <p className="text-xs text-amber-200/80">Nenhuma imagem enviada ainda.</p>
              )}
              <Field label="Legenda">
                <input value={caption} onChange={(e) => setCaption(e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Texto alternativo">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="Descrição da imagem" />
              </Field>
              <Field label="Largura">
                <select value={width} onChange={(e) => setWidth(e.target.value as "sm" | "md" | "lg" | "full")} className={fieldClass}>
                  <option value="sm">Pequena</option>
                  <option value="md">Média</option>
                  <option value="lg">Grande</option>
                  <option value="full">Total</option>
                </select>
              </Field>
            </>
          )}

          {block.type === "CHECKLIST" && (
            <>
              <Field label="Título do checklist">
                <input value={content} onChange={(e) => setContent(e.target.value)} className={fieldClass} />
              </Field>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/55">Itens</p>
                {items.map((item, index) => (
                  <div key={item.id || index} className="flex gap-2">
                    <input
                      value={item.text}
                      onChange={(e) => {
                        const next = [...items];
                        next[index] = { ...item, text: e.target.value };
                        setItems(next);
                      }}
                      className={cn(fieldClass, "flex-1")}
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-2 text-red-300/80 hover:bg-red-500/10"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItems([...items, { text: "Novo item" }])}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar item
                </Button>
              </div>
            </>
          )}

          {block.type === "DIVIDER" && (
            <p className="text-sm text-white/50">Divisor visual — sem campos adicionais.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                const settings = { ...block.settings };
                if (block.type === "HEADING" || block.type === "SUBHEADING") settings.level = level;
                if (
                  block.type === "TIP" ||
                  block.type === "WARNING" ||
                  block.type === "INFO" ||
                  block.type === "EXAMPLE"
                ) {
                  settings.title = title || undefined;
                }
                if (block.type === "IMAGE") {
                  settings.alt = title || undefined;
                  settings.width = width;
                }
                if (block.type === "BULLET_LIST" || block.type === "NUMBERED_LIST") {
                  settings.items = listText
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean);
                }

                void onSave({
                  content:
                    block.type === "BULLET_LIST" || block.type === "NUMBERED_LIST" ? listText : content,
                  imageCaption: block.type === "IMAGE" ? caption || null : undefined,
                  settings,
                  checklistItems: block.type === "CHECKLIST" ? items : undefined
                }).finally(() => setSaving(false));
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar bloco
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onToggleExpand}>
              Fechar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const fieldClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#8A1DEE]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-white/55">
      {label}
      {children}
    </label>
  );
}
