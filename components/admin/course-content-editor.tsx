"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, CheckCircle2, Edit3, Eye, EyeOff, GripVertical, Lock, MoreHorizontal, Plus, Save, Trash2, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  createCategoria,
  createBanner,
  createModule,
  deleteBanner,
  deleteCategoria,
  deleteModule,
  moveModuleToCategoria,
  removeModuleFromCategoria,
  reorderDashboardBlocks,
  reorderModules,
  updateBanner,
  updateBannerStatus,
  updateCategoria,
  updateModule,
  updateModuleStatus
} from "@/lib/actions";

type Status = "DRAFT" | "PUBLISHED" | "HIDDEN";

type ModuleEditor = {
  id: string;
  categoriaId: string;
  number: string;
  title: string;
  objective: string | null;
  coverImagePath: string | null;
  hideText: boolean;
  order: number;
  status: Status;
  lessonCount: number;
  completedLessons: number;
  percent: number;
};

type CategoriaEditor = {
  id: string;
  title: string;
  description: string | null;
  coverImagePath: string | null;
  order: number;
  status: Status;
  modules: ModuleEditor[];
};

type BannerEditor = {
  id: string;
  imageUrl: string | null;
  images: {
    id: string;
    imageUrl: string;
    order: number;
  }[];
  title: string | null;
  subtitle: string | null;
  order: number;
  status: "ACTIVE" | "INACTIVE";
  targetType: "CATEGORY" | "MODULE" | "URL" | null;
  targetId: string | null;
  targetUrl: string | null;
};

type DashboardBlockEditor = {
  id: string;
  type: "BANNER" | "CATEGORY";
  order: number;
  bannerId: string | null;
  categoriaId: string | null;
};

type CourseEditor = {
  id: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  hideText: boolean;
};

type CourseContentEditorProps = {
  course: CourseEditor;
  banners: BannerEditor[];
  dashboardBlocks: DashboardBlockEditor[];
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageBaseUrl: string | null;
  storageUploadReady: boolean;
};

function assetUrl(path: string | null, storageBaseUrl: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return storageBaseUrl ? `${storageBaseUrl}/${path}` : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-white/65">
      {label}
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="min-h-11 min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]" />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]" />;
}

function FileInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg border border-dashed border-white/15 bg-black/25 px-3 py-2 text-white/70 data-[disabled=true]:opacity-45" data-disabled={props.disabled}>
      <Upload className="h-4 w-4 shrink-0 text-[#8A1DEE]" />
      <input {...props} type="file" accept="image/png,image/jpeg,image/webp" className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#53009F] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[#8A1DEE] disabled:cursor-not-allowed" />
    </div>
  );
}

function ToggleField({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm font-semibold text-white/75">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-[#8A1DEE]" />
      {label}
    </label>
  );
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]" />;
}

function ConfirmActionButton({
  label,
  confirmText,
  icon,
  variant,
  action
}: {
  label: string;
  confirmText?: string;
  icon: React.ReactNode;
  variant?: "secondary" | "destructive" | "outline";
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={variant || "secondary"}
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        startTransition(() => {
          void action();
        });
      }}
    >
      {icon}
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function BannerStatusPill({ status }: { status: BannerEditor["status"] }) {
  return (
    <div className="absolute left-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-bold uppercase text-white/75">
      {status === "ACTIVE" ? "Ativo" : "Inativo"}
    </div>
  );
}

function BannerCard({ banner, storageBaseUrl }: { banner: BannerEditor; storageBaseUrl: string | null }) {
  const firstImage = banner.images[0]?.imageUrl || banner.imageUrl;
  const imageUrl = assetUrl(firstImage, storageBaseUrl);
  const title = banner.title?.trim() || "";
  const subtitle = banner.subtitle?.trim() || "";
  const hasText = Boolean(title || subtitle);

  // Rule: any image → show ONLY the image (title/subtitle stay in DB, not rendered).
  if (imageUrl) {
    return (
      <div className="group relative w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#151019] shadow-xl transition hover:border-[#8A1DEE]/60">
        <BannerStatusPill status={banner.status} />
        <Image
          src={imageUrl}
          alt={title || "Banner"}
          width={1600}
          height={500}
          sizes="100vw"
          className="block h-auto w-full max-w-full object-cover"
          style={{ width: "100%", height: "auto" }}
        />
      </div>
    );
  }

  // No image → text only (full width).
  return (
    <div className="group relative flex min-h-[190px] w-full max-w-full min-w-0 flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-[#151019] p-5 shadow-xl transition hover:border-[#8A1DEE]/60 sm:min-h-[250px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(138,29,238,.55),transparent_38%),linear-gradient(145deg,#08050d,#1a1023_55%,#050306)]" />
      <BannerStatusPill status={banner.status} />
      <div className="relative z-[1] w-full max-w-full">
        {title ? <h3 className="break-words text-xl font-black leading-tight text-white sm:text-2xl">{title}</h3> : null}
        {subtitle ? <p className="mt-2 break-words text-sm text-white/68">{subtitle}</p> : null}
        {!hasText ? <p className="text-sm text-white/50">Banner sem imagem ou texto</p> : null}
      </div>
    </div>
  );
}

/** Dropdown menu rendered in a portal so overflow carousels cannot clip it. */
function FloatingOptionsMenu({
  open,
  onOpenChange,
  children,
  panelClassName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  panelClassName?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  function placeMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = panelRef.current?.offsetWidth || 224;
    const panelHeight = panelRef.current?.offsetHeight || 220;
    const gap = 8;
    const spaceRight = window.innerWidth - rect.right;
    const openLeft = spaceRight < panelWidth + 12;
    const left = openLeft
      ? Math.max(8, rect.right - panelWidth)
      : Math.min(rect.left, window.innerWidth - panelWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const top =
      spaceBelow < panelHeight && rect.top > panelHeight + gap
        ? Math.max(8, rect.top - panelHeight - gap)
        : Math.min(rect.bottom + gap, Math.max(8, window.innerHeight - panelHeight - 8));
    setCoords({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    // Second pass after portal paints so real panel size is known.
    const id = window.requestAnimationFrame(() => placeMenu());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Abrir opcoes"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white transition hover:bg-black/55 hover:text-[#8A1DEE]"
        onClick={() => onOpenChange(!open)}
      >
        <MoreHorizontal className="h-6 w-6" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className={panelClassName || "w-56 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl"}
              style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 60 }}
              role="menu"
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const menuItemClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8";

function BannerDestinationFields({
  banner,
  categorias,
  allModules
}: {
  banner?: BannerEditor;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
}) {
  const [targetType, setTargetType] = useState(banner?.targetType || "");

  return (
    <div className="grid gap-4">
      <Field label="Tipo de destino">
        <SelectField name="targetType" value={targetType} onChange={(event) => setTargetType(event.target.value)}>
          <option value="">Sem link</option>
          <option value="CATEGORY">Categoria</option>
          <option value="MODULE">Modulo</option>
          <option value="URL">URL externa</option>
        </SelectField>
      </Field>
      {targetType === "CATEGORY" ? (
        <Field label="Categoria de destino">
          <SelectField name="targetCategoryId" defaultValue={banner?.targetType === "CATEGORY" ? banner.targetId || "" : ""}>
            <option value="">Escolher categoria</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.title}</option>
            ))}
          </SelectField>
        </Field>
      ) : null}
      {targetType === "MODULE" ? (
        <Field label="Modulo de destino">
          <SelectField name="targetModuleId" defaultValue={banner?.targetType === "MODULE" ? banner.targetId || "" : ""}>
            <option value="">Escolher modulo</option>
            {allModules.map((module) => (
              <option key={module.id} value={module.id}>Modulo {module.number} - {module.title}</option>
            ))}
          </SelectField>
        </Field>
      ) : null}
      {targetType === "URL" ? (
        <Field label="URL externa">
          <TextInput name="targetUrl" defaultValue={banner?.targetType === "URL" ? banner.targetUrl || "" : ""} placeholder="https://..." />
        </Field>
      ) : null}
    </div>
  );
}

function BannerSettingsDialog({
  banner,
  storageBaseUrl,
  categorias,
  allModules,
  storageUploadReady,
  open,
  onOpenChange
}: {
  banner: BannerEditor;
  storageBaseUrl: string | null;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Editar banner</DialogTitle>
        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60">
          Quando houver imagem cadastrada, o aluno verá somente a imagem. Os textos serão exibidos apenas quando o banner não possuir imagens.
        </p>
        <form
          className="grid gap-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await updateBanner(formData);
                onOpenChange(false);
              } catch {
                setError("Não foi possível salvar o banner. Tente novamente.");
              }
            });
          }}
        >
          <input type="hidden" name="id" value={banner.id} />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <Field label="Título opcional">
              <TextInput name="title" defaultValue={banner.title || ""} />
            </Field>
            <Field label="Status">
              <SelectField name="status" defaultValue={banner.status}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </SelectField>
            </Field>
          </div>
          <Field label="Subtítulo opcional">
            <TextArea name="subtitle" defaultValue={banner.subtitle || ""} rows={2} />
          </Field>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold text-white">Imagens do bloco</h3>
            <p className="mt-1 text-sm text-white/55">Use de 1 a 3 imagens. Com imagem, o aluno vê somente a imagem.</p>
            {banner.images.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {banner.images.map((image) => {
                  const previewUrl = assetUrl(image.imageUrl, storageBaseUrl);
                  return (
                    <label key={image.id} className="grid gap-2 rounded-lg border border-white/10 bg-black/25 p-2 text-xs font-semibold text-white/70">
                      <span className="relative h-24 overflow-hidden rounded-md bg-black/40">
                        {previewUrl ? <Image src={previewUrl} alt="Imagem do banner" fill sizes="180px" className="object-cover" /> : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <input type="checkbox" name="removeImageIds" value={image.id} className="h-4 w-4 accent-[#8A1DEE]" />
                        Remover
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-white/15 p-3 text-sm text-white/45">Nenhuma imagem cadastrada neste bloco.</p>
            )}
            <div className="mt-4 grid gap-3">
              <FileInput name="bannerFile1" disabled={!storageUploadReady || banner.images.length >= 3} />
              <FileInput name="bannerFile2" disabled={!storageUploadReady || banner.images.length >= 2} />
              <FileInput name="bannerFile3" disabled={!storageUploadReady || banner.images.length >= 1} />
              <TextInput name="imageUrl1" placeholder="URL opcional de imagem" />
            </div>
          </div>
          <BannerDestinationFields banner={banner} categorias={categorias} allModules={allModules} />
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="w-fit" disabled={pending}>
              {pending ? "Salvando..." : null}
              {!pending ? <Save className="h-4 w-4" /> : null}
              {pending ? "Aguarde" : "Salvar banner"}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BannerMenu({
  banner,
  storageBaseUrl,
  categorias,
  allModules,
  storageUploadReady
}: {
  banner: BannerEditor;
  storageBaseUrl: string | null;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-30">
      <FloatingOptionsMenu open={menuOpen} onOpenChange={setMenuOpen} panelClassName="w-52 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl">
        <button
          type="button"
          className={menuItemClass}
          onClick={() => {
            setMenuOpen(false);
            setEditOpen(true);
          }}
        >
          <Edit3 className="h-4 w-4 text-[#8A1DEE]" />
          Editar banner
        </button>
        <button
          className={menuItemClass}
          type="button"
          onClick={() => {
            void updateBannerStatus(banner.id, banner.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
            setMenuOpen(false);
          }}
        >
          {banner.status === "ACTIVE" ? <EyeOff className="h-4 w-4 text-[#8A1DEE]" /> : <Eye className="h-4 w-4 text-[#8A1DEE]" />}
          {banner.status === "ACTIVE" ? "Desativar" : "Ativar"}
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-red-100 hover:bg-red-500/10"
          onClick={() => {
            setMenuOpen(false);
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-300" />
          Excluir banner
        </button>
      </FloatingOptionsMenu>

      <BannerSettingsDialog
        banner={banner}
        storageBaseUrl={storageBaseUrl}
        categorias={categorias}
        allModules={allModules}
        storageUploadReady={storageUploadReady}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir banner</AlertDialogTitle>
          <AlertDialogDescription>
            Este banner será removido da área de membros. A imagem enviada no storage não será apagada automaticamente.
          </AlertDialogDescription>
          <div className="flex flex-wrap gap-3">
            <AlertDialogAction asChild>
              <Button type="button" variant="destructive" onClick={() => void deleteBanner(banner.id)}>
                Excluir definitivamente
              </Button>
            </AlertDialogAction>
            <AlertDialogCancel className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-[#F5F3F3] hover:bg-white/12">
              Cancelar
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NewBannerDialog({
  courseId,
  categorias,
  allModules,
  storageUploadReady
}: {
  courseId: string;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-4 w-4" />
          Novo banner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Novo banner</DialogTitle>
        <form action={createBanner} className="grid gap-4">
          <input type="hidden" name="courseId" value={courseId} />
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-bold text-white">Imagens do bloco</h3>
            <p className="mt-1 text-sm text-white/55">Adicione de 1 a 3 imagens. Se adicionar mais de uma, este bloco rotaciona somente entre elas.</p>
            <div className="mt-4 grid gap-3">
              <FileInput name="bannerFile1" disabled={!storageUploadReady} />
              <FileInput name="bannerFile2" disabled={!storageUploadReady} />
              <FileInput name="bannerFile3" disabled={!storageUploadReady} />
              <TextInput name="imageUrl1" placeholder="URL opcional de imagem" />
              <TextInput name="imageUrl2" placeholder="URL opcional de segunda imagem" />
              <TextInput name="imageUrl3" placeholder="URL opcional de terceira imagem" />
            </div>
          </div>
          <Field label="Titulo opcional">
            <TextInput name="title" />
          </Field>
          <Field label="Subtitulo opcional">
            <TextArea name="subtitle" rows={2} />
          </Field>
          <BannerDestinationFields categorias={categorias} allModules={allModules} />
          <Button type="submit" className="w-fit">
            <Save className="h-4 w-4" />
            Criar banner
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MODULE_CARD_WIDTH_PX = 260;

function ModuleCard({ module, storageBaseUrl }: { module: ModuleEditor; storageBaseUrl: string | null }) {
  const coverUrl = assetUrl(module.coverImagePath, storageBaseUrl);
  const showText = !coverUrl && !module.hideText;

  return (
    <div
      className="module-carousel-card group relative h-[292px] overflow-hidden rounded-lg border border-white/10 bg-[#151019] text-left shadow-xl transition hover:border-[#8A1DEE]/60"
      style={{ width: MODULE_CARD_WIDTH_PX, minWidth: MODULE_CARD_WIDTH_PX, maxWidth: MODULE_CARD_WIDTH_PX, flex: "0 0 auto" }}
    >
      {coverUrl ? <Image src={coverUrl} alt={module.title || "Modulo"} fill sizes="260px" className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(138,29,238,.55),transparent_35%),linear-gradient(145deg,#08050d,#1a1023_55%,#050306)]" />}
      {showText ? <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/10" /> : null}
      {showText && module.status !== "PUBLISHED" ? (
        <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/75">
          <Lock className="h-4 w-4" />
        </div>
      ) : null}
      {showText ? (
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#8A1DEE]">Modulo {module.number}</p>
          {module.title ? <h3 className="mt-2 line-clamp-3 break-words text-xl font-black leading-tight text-white">{module.title}</h3> : null}
          <p className="mt-3 text-xs text-white/70">{module.lessonCount} aulas</p>
        </div>
      ) : null}
    </div>
  );
}

function SortableCard({ id, children, fullWidth = false }: { id: string; children: React.ReactNode; fullWidth?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // Translate-only so drag never resizes the card (scale would change perceived width).
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(fullWidth
      ? { width: "100%", maxWidth: "100%", minWidth: 0 }
      : {
          width: MODULE_CARD_WIDTH_PX,
          minWidth: MODULE_CARD_WIDTH_PX,
          maxWidth: MODULE_CARD_WIDTH_PX,
          flex: "0 0 auto"
        })
  };

  return (
    <div ref={setNodeRef} style={style} className={`module-sortable-item ${isDragging ? "opacity-70 z-20" : ""}`}>
      <div className="relative min-w-0">
        <button type="button" aria-label="Arrastar" className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white/80 hover:bg-black/55 hover:text-white" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function CategoriaSettingsDialog({
  categoria,
  storageUploadReady,
  open,
  onOpenChange
}: {
  categoria: CategoriaEditor;
  storageUploadReady: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Editar categoria</DialogTitle>
        <form
          className="grid gap-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await updateCategoria(formData);
                onOpenChange(false);
              } catch {
                setError("Não foi possível salvar a categoria.");
              }
            });
          }}
        >
          <input type="hidden" name="id" value={categoria.id} />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <Field label="Título">
              <TextInput name="title" defaultValue={categoria.title} />
            </Field>
            <Field label="Ordem">
              <TextInput name="order" type="number" defaultValue={categoria.order} />
            </Field>
          </div>
          <Field label="Descrição">
            <TextArea name="description" defaultValue={categoria.description || ""} rows={3} />
          </Field>
          <Field label="Status">
            <SelectField name="status" defaultValue={categoria.status}>
              <option value="PUBLISHED">Publicado</option>
              <option value="DRAFT">Rascunho</option>
              <option value="HIDDEN">Oculto</option>
            </SelectField>
          </Field>
          <Field label="Capa da categoria">
            <FileInput name="coverFile" disabled={!storageUploadReady} />
          </Field>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <Button type="submit" className="w-fit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "Salvando..." : "Salvar categoria"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddModuleDialog({
  categoria,
  allModules,
  storageUploadReady,
  open,
  onOpenChange
}: {
  categoria: CategoriaEditor;
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const movableModules = allModules.filter((module) => module.categoriaId !== categoria.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Adicionar módulo a {categoria.title}</DialogTitle>
        <form action={createModule} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <input type="hidden" name="categoriaId" value={categoria.id} />
          <Field label="Título do novo módulo">
            <TextInput name="title" />
          </Field>
          <Field label="Objetivo">
            <TextArea name="objective" rows={2} />
          </Field>
          <ToggleField name="hideText" label="Ocultar texto" />
          <Field label="Capa do módulo">
            <FileInput name="coverFile" disabled={!storageUploadReady} />
          </Field>
          <Button type="submit" className="w-fit">
            <Save className="h-4 w-4" />
            Criar módulo
          </Button>
        </form>

        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-bold">Mover módulo existente</h3>
          {movableModules.length ? (
            movableModules.map((module) => (
              <form key={module.id} action={moveModuleToCategoria} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-black/20 p-3">
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="categoriaId" value={categoria.id} />
                <span className="break-words text-sm font-bold">{module.title || `Módulo ${module.number}`}</span>
                <Button type="submit" size="sm">
                  Mover para cá
                </Button>
              </form>
            ))
          ) : (
            <p className="text-sm text-white/55">Não há módulos em outras categorias.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RemoveModuleDialog({ categoria, open, onOpenChange }: { categoria: CategoriaEditor; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Remover módulo de {categoria.title}</DialogTitle>
        <div className="space-y-3">
          {categoria.modules.length ? (
            categoria.modules.map((module) => (
              <div key={module.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="break-words font-bold">{module.title || `Módulo ${module.number}`}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={removeModuleFromCategoria}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="mode" value="move" />
                    <Button type="submit" size="sm" variant="secondary">
                      Mover para Geral
                    </Button>
                  </form>
                  <form action={removeModuleFromCategoria}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="mode" value="delete" />
                    <Button type="submit" size="sm" variant="destructive">
                      Excluir definitivamente
                    </Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/55">Esta categoria ainda não tem módulos.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoriaMenu({ categoria, allModules, storageUploadReady }: { categoria: CategoriaEditor; allModules: ModuleEditor[]; storageUploadReady: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-30">
      <FloatingOptionsMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <button type="button" className={menuItemClass} onClick={() => { setMenuOpen(false); setEditOpen(true); }}>
          <Edit3 className="h-4 w-4 text-[#8A1DEE]" />
          Editar categoria
        </button>
        <button type="button" className={menuItemClass} onClick={() => { setMenuOpen(false); setAddOpen(true); }}>
          <Plus className="h-4 w-4 text-[#8A1DEE]" />
          Adicionar módulo
        </button>
        <button type="button" className={menuItemClass} onClick={() => { setMenuOpen(false); setRemoveOpen(true); }}>
          <EyeOff className="h-4 w-4 text-[#8A1DEE]" />
          Remover módulo
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-red-100 hover:bg-red-500/10"
          onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
        >
          <Trash2 className="h-4 w-4 text-red-300" />
          Excluir categoria
        </button>
      </FloatingOptionsMenu>

      <CategoriaSettingsDialog categoria={categoria} storageUploadReady={storageUploadReady} open={editOpen} onOpenChange={setEditOpen} />
      <AddModuleDialog categoria={categoria} allModules={allModules} storageUploadReady={storageUploadReady} open={addOpen} onOpenChange={setAddOpen} />
      <RemoveModuleDialog categoria={categoria} open={removeOpen} onOpenChange={setRemoveOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
          <AlertDialogDescription>
            Escolha o que fazer com os módulos dentro de {categoria.title}. Mover para Geral preserva aulas e progresso. Excluir definitivamente remove módulos, aulas e progresso associado.
          </AlertDialogDescription>
          <div className="flex flex-wrap gap-3">
            <form action={deleteCategoria}>
              <input type="hidden" name="id" value={categoria.id} />
              <input type="hidden" name="mode" value="move" />
              <AlertDialogAction asChild>
                <Button type="submit" variant="secondary">
                  Mover módulos para Geral
                </Button>
              </AlertDialogAction>
            </form>
            <form action={deleteCategoria}>
              <input type="hidden" name="id" value={categoria.id} />
              <input type="hidden" name="mode" value="delete" />
              <AlertDialogAction asChild>
                <Button type="submit" variant="destructive">
                  Excluir tudo
                </Button>
              </AlertDialogAction>
            </form>
            <AlertDialogCancel className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-[#F5F3F3] hover:bg-white/12">
              Cancelar
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModuleSettingsDialog({
  module,
  storageBaseUrl,
  storageUploadReady,
  open,
  onOpenChange
}: {
  module: ModuleEditor;
  storageBaseUrl: string | null;
  storageUploadReady: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogTitle>Editar módulo</DialogTitle>
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <ModuleCard module={module} storageBaseUrl={storageBaseUrl} />
            <div className="flex flex-wrap gap-2">
              <ConfirmActionButton
                label={module.status === "PUBLISHED" ? "Ocultar" : "Publicar"}
                icon={module.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                action={() => updateModuleStatus(module.id, module.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED")}
              />
              <ConfirmActionButton
                label="Excluir"
                icon={<Trash2 className="h-4 w-4" />}
                variant="destructive"
                confirmText="Excluir este módulo e todas as aulas/progressos associados?"
                action={() => deleteModule(module.id)}
              />
            </div>
          </div>
          <form
            className="grid min-w-0 gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                try {
                  await updateModule(formData);
                  onOpenChange(false);
                } catch {
                  setError("Não foi possível salvar o módulo. Tente novamente.");
                }
              });
            }}
          >
            <input type="hidden" name="id" value={module.id} />
            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
              <Field label="Título">
                <TextInput name="title" defaultValue={module.title} />
              </Field>
              <Field label="Ordem">
                <TextInput name="order" type="number" defaultValue={module.order} />
              </Field>
            </div>
            <Field label="Objetivo">
              <TextArea name="objective" defaultValue={module.objective || ""} rows={3} />
            </Field>
            <ToggleField name="hideText" defaultChecked={module.hideText} label="Ocultar texto" />
            <Field label="Capa do módulo">
              <FileInput name="coverFile" disabled={!storageUploadReady} />
            </Field>
            {error ? <p className="text-sm text-red-200">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="w-fit" disabled={pending}>
                <Save className="h-4 w-4" />
                {pending ? "Salvando..." : "Salvar módulo"}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModuleMenu({ module, storageBaseUrl, storageUploadReady }: { module: ModuleEditor; storageBaseUrl: string | null; storageUploadReady: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-30">
      <FloatingOptionsMenu open={menuOpen} onOpenChange={setMenuOpen} panelClassName="w-48 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl">
        <Link
          href={`/admin/conteudo/${module.id}`}
          className={menuItemClass}
          onClick={() => setMenuOpen(false)}
        >
          <BookOpen className="h-4 w-4 text-[#8A1DEE]" />
          Editar conteúdo
        </Link>
        <button
          type="button"
          className={menuItemClass}
          onClick={() => {
            setMenuOpen(false);
            setEditOpen(true);
          }}
        >
          <Edit3 className="h-4 w-4 text-[#8A1DEE]" />
          Editar módulo
        </button>
      </FloatingOptionsMenu>
      <ModuleSettingsDialog
        module={module}
        storageBaseUrl={storageBaseUrl}
        storageUploadReady={storageUploadReady}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

function SortableModule({ module, storageBaseUrl, storageUploadReady }: { module: ModuleEditor; storageBaseUrl: string | null; storageUploadReady: boolean }) {
  return (
    <SortableCard id={module.id}>
      <ModuleCard module={module} storageBaseUrl={storageBaseUrl} />
      <ModuleMenu module={module} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />
    </SortableCard>
  );
}

type DashboardBlockItem = {
  block: DashboardBlockEditor;
  banner: BannerEditor;
  categoria?: never;
} | {
  block: DashboardBlockEditor;
  categoria: CategoriaEditor;
  banner?: never;
};

function buildDashboardBlockItems(blocks: DashboardBlockEditor[], banners: BannerEditor[], categorias: CategoriaEditor[]) {
  const bannerMap = new Map(banners.map((banner) => [banner.id, banner]));
  const categoriaMap = new Map(categorias.map((categoria) => [categoria.id, categoria]));

  return blocks
    .map((block) => {
      if (block.type === "BANNER" && block.bannerId) {
        const banner = bannerMap.get(block.bannerId);
        return banner ? { block, banner } : null;
      }
      if (block.type === "CATEGORY" && block.categoriaId) {
        const categoria = categoriaMap.get(block.categoriaId);
        return categoria ? { block, categoria } : null;
      }
      return null;
    })
    .filter((item): item is DashboardBlockItem => Boolean(item));
}

function SortableDashboardBlock({
  item,
  storageBaseUrl,
  categorias,
  allModules,
  storageUploadReady
}: {
  item: DashboardBlockItem;
  storageBaseUrl: string | null;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  return (
    <SortableCard id={item.block.id} fullWidth>
      {item.banner ? (
        <>
          <BannerCard banner={item.banner} storageBaseUrl={storageBaseUrl} />
          <BannerMenu banner={item.banner} storageBaseUrl={storageBaseUrl} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
        </>
      ) : null}
      {item.categoria ? (
        <>
          <CategoryDashboardCard categoria={item.categoria} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />
          <CategoriaMenu categoria={item.categoria} allModules={allModules} storageUploadReady={storageUploadReady} />
        </>
      ) : null}
    </SortableCard>
  );
}

function CategoryDashboardCard({
  categoria,
  storageBaseUrl,
  storageUploadReady
}: {
  categoria: CategoriaEditor;
  storageBaseUrl: string | null;
  storageUploadReady: boolean;
}) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-white/10 bg-[#151019] p-5 shadow-xl transition hover:border-[#8A1DEE]/50">
      <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-4 pl-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#8A1DEE]">{categoria.status}</p>
          <h3 className="mt-1 break-words text-2xl font-bold text-white">{categoria.title}</h3>
          {categoria.description ? <p className="mt-1 max-w-2xl break-words text-sm text-white/55">{categoria.description}</p> : null}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/60">{categoria.modules.length} modulos</span>
      </div>
      <div className="min-w-0 max-w-full">
        <ModuleShelf categoria={categoria} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />
      </div>
    </div>
  );
}

function DashboardBlockShelf({
  courseId,
  blocks,
  banners,
  categorias,
  storageBaseUrl,
  allModules,
  storageUploadReady
}: {
  courseId: string;
  blocks: DashboardBlockEditor[];
  banners: BannerEditor[];
  categorias: CategoriaEditor[];
  storageBaseUrl: string | null;
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  const [items, setItems] = useState(() => buildDashboardBlockItems(blocks, banners, categorias));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(buildDashboardBlockItems(blocks, banners, categorias));
  }, [blocks, banners, categorias]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.block.id === active.id);
    const newIndex = items.findIndex((item) => item.block.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => void reorderDashboardBlocks(courseId, next.map((item) => item.block.id)));
  }

  if (!items.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-white/15 text-sm text-white/50">
        Nenhum bloco cadastrado na area de membros.
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.block.id)} strategy={verticalListSortingStrategy}>
        <div className="grid min-w-0 max-w-full gap-6 data-[pending=true]:opacity-80" data-pending={pending}>
          {items.map((item) => (
            <SortableDashboardBlock key={item.block.id} item={item} storageBaseUrl={storageBaseUrl} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ModuleShelf({ categoria, storageBaseUrl, storageUploadReady }: { categoria: CategoriaEditor; storageBaseUrl: string | null; storageUploadReady: boolean }) {
  const [items, setItems] = useState(categoria.modules);
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    })
  );

  useEffect(() => {
    setItems(categoria.modules);
  }, [categoria.modules]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => void reorderModules(categoria.id, next.map((item) => item.id)));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      autoScroll={{ threshold: { x: 0.12, y: 0.2 }, acceleration: 12 }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
        <div ref={scrollerRef} className="module-carousel-viewport data-[pending=true]:opacity-80" data-pending={pending}>
          <div className="module-carousel-track">
            {items.length ? (
              items.map((module) => <SortableModule key={module.id} module={module} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />)
            ) : (
              <div
                className="module-carousel-card flex h-[180px] items-center justify-center rounded-lg border border-dashed border-white/15 text-sm text-white/50"
                style={{ width: MODULE_CARD_WIDTH_PX, minWidth: MODULE_CARD_WIDTH_PX, maxWidth: MODULE_CARD_WIDTH_PX, flex: "0 0 auto" }}
              >
                Categoria vazia
              </div>
            )}
            {/* Spacer so the last card can fully enter the viewport when scrolling */}
            {items.length > 0 ? <div className="module-carousel-end-spacer" aria-hidden /> : null}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function NewCategoryDialog({ courseId, storageUploadReady }: { courseId: string; storageUploadReady: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Nova categoria</DialogTitle>
        <form action={createCategoria} className="grid gap-4">
          <input type="hidden" name="courseId" value={courseId} />
          <Field label="Titulo">
            <TextInput name="title" />
          </Field>
          <Field label="Descricao">
            <TextArea name="description" rows={3} />
          </Field>
          <Field label="Capa da categoria">
            <FileInput name="coverFile" disabled={!storageUploadReady} />
          </Field>
          <Button type="submit" className="w-fit">
            <Save className="h-4 w-4" />
            Criar categoria
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CourseContentEditor({ course, banners, dashboardBlocks, categorias, allModules, storageBaseUrl, storageUploadReady }: CourseContentEditorProps) {
  const totalLessons = allModules.reduce((sum, module) => sum + module.lessonCount, 0);
  const publishedCategorias = categorias.filter((categoria) => categoria.status === "PUBLISHED").length;
  const activeBanners = banners.filter((banner) => banner.status === "ACTIVE").length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-full">
      <div className="min-w-0 max-w-full space-y-8">
        <header className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Curso</p>
            <h1 className="mt-2 break-words text-4xl font-bold">Categorias e modulos</h1>
            <p className="mt-3 break-words text-white/62">Curso &gt; Categoria &gt; Modulo &gt; Aula. Categorias organizam modulos, modulos organizam aulas.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <NewBannerDialog courseId={course.id} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
            <NewCategoryDialog courseId={course.id} storageUploadReady={storageUploadReady} />
          </div>
        </header>

        {!storageUploadReady ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
            Upload de imagens desativado: falta configurar R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME e R2_PUBLIC_BASE_URL no ambiente local e na Vercel.
          </div>
        ) : null}

        <section className="grid min-w-0 gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#151019] p-5">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-[#8A1DEE]" />
              <div>
                <h2 className="font-bold">Categorias publicadas</h2>
                <p className="text-sm text-white/55">{publishedCategorias} categorias visiveis</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#151019] p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#8A1DEE]" />
              <div>
                <h2 className="font-bold">Destaques ativos</h2>
                <p className="text-sm text-white/55">{activeBanners} banners visiveis e {totalLessons} aulas cadastradas</p>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 max-w-full space-y-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">Organizacao da area de membros</h2>
            <p className="mt-1 text-sm text-white/55">Arraste banners e categorias para escolher a ordem exata em que aparecem para o aluno.</p>
          </div>
          <DashboardBlockShelf courseId={course.id} blocks={dashboardBlocks} banners={banners} categorias={categorias} storageBaseUrl={storageBaseUrl} allModules={allModules} storageUploadReady={storageUploadReady} />
        </section>
      </div>
    </div>
  );
}
