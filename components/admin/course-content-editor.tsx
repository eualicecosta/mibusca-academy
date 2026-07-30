"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, CheckCircle2, Edit3, Eye, EyeOff, GripVertical, Lock, MoreHorizontal, Plus, Save, Trash2, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger
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
  reorderBanners,
  reorderCategorias,
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
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  order: number;
  status: "ACTIVE" | "INACTIVE";
  targetType: "CATEGORY" | "MODULE" | "URL" | null;
  targetId: string | null;
  targetUrl: string | null;
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

function BannerCard({ banner, storageBaseUrl }: { banner: BannerEditor; storageBaseUrl: string | null }) {
  const imageUrl = assetUrl(banner.imageUrl, storageBaseUrl);

  return (
    <div className="group relative h-[170px] w-[360px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#151019] shadow-xl transition hover:border-[#8A1DEE]/60 sm:w-[420px]">
      {imageUrl ? <Image src={imageUrl} alt={banner.title || "Banner"} fill sizes="420px" className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(138,29,238,.55),transparent_38%),linear-gradient(145deg,#08050d,#1a1023_55%,#050306)]" />}
      {(banner.title || banner.subtitle) ? <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/35 to-transparent" /> : null}
      <div className="absolute left-4 top-4 rounded-full bg-black/65 px-3 py-1 text-xs font-bold uppercase text-white/75">
        {banner.status === "ACTIVE" ? "Ativo" : "Inativo"}
      </div>
      {(banner.title || banner.subtitle) ? (
        <div className="absolute inset-x-0 bottom-0 max-w-[82%] p-4">
          {banner.title ? <h3 className="line-clamp-2 break-words text-xl font-black leading-tight text-white">{banner.title}</h3> : null}
          {banner.subtitle ? <p className="mt-2 line-clamp-2 break-words text-sm text-white/68">{banner.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

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
  categorias,
  allModules,
  storageUploadReady
}: {
  banner: BannerEditor;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8" type="button">
          <Edit3 className="h-4 w-4 text-[#8A1DEE]" />
          Editar banner
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Editar banner</DialogTitle>
        <form action={updateBanner} className="grid gap-4">
          <input type="hidden" name="id" value={banner.id} />
          <input type="hidden" name="currentImageUrl" value={banner.imageUrl} />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <Field label="Titulo opcional">
              <TextInput name="title" defaultValue={banner.title || ""} />
            </Field>
            <Field label="Ordem">
              <TextInput name="order" type="number" defaultValue={banner.order} />
            </Field>
          </div>
          <Field label="Subtitulo opcional">
            <TextArea name="subtitle" defaultValue={banner.subtitle || ""} rows={2} />
          </Field>
          <Field label="Status">
            <SelectField name="status" defaultValue={banner.status}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </SelectField>
          </Field>
          <Field label="Imagem do banner (1280 x 360)">
            <FileInput name="bannerFile" disabled={!storageUploadReady} />
          </Field>
          <Field label="URL da imagem">
            <TextInput name="imageUrl" defaultValue={banner.imageUrl.startsWith("http") ? banner.imageUrl : ""} placeholder="Opcional se enviar arquivo" />
          </Field>
          <BannerDestinationFields banner={banner} categorias={categorias} allModules={allModules} />
          <Button type="submit" className="w-fit">
            <Save className="h-4 w-4" />
            Salvar banner
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBannerDialog({ banner }: { banner: BannerEditor }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-red-100 hover:bg-red-500/10" type="button">
          <Trash2 className="h-4 w-4 text-red-300" />
          Excluir banner
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Excluir banner</AlertDialogTitle>
        <AlertDialogDescription>Este banner sera removido da area de membros. A imagem enviada no storage nao sera apagada automaticamente.</AlertDialogDescription>
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
  );
}

function BannerMenu({
  banner,
  categorias,
  allModules,
  storageUploadReady
}: {
  banner: BannerEditor;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-30">
      <button type="button" aria-label="Abrir opcoes" className="flex h-8 w-8 items-center justify-center text-white transition hover:text-[#8A1DEE]" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="h-6 w-6" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 w-52 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl">
          <BannerSettingsDialog banner={banner} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8"
            type="button"
            onClick={() => void updateBannerStatus(banner.id, banner.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
          >
            {banner.status === "ACTIVE" ? <EyeOff className="h-4 w-4 text-[#8A1DEE]" /> : <Eye className="h-4 w-4 text-[#8A1DEE]" />}
            {banner.status === "ACTIVE" ? "Desativar" : "Ativar"}
          </button>
          <DeleteBannerDialog banner={banner} />
        </div>
      ) : null}
    </div>
  );
}

function SortableBanner({
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
  return (
    <SortableCard id={banner.id}>
      <BannerCard banner={banner} storageBaseUrl={storageBaseUrl} />
      <BannerMenu banner={banner} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
    </SortableCard>
  );
}

function BannerShelf({
  banners,
  storageBaseUrl,
  categorias,
  allModules,
  storageUploadReady
}: {
  banners: BannerEditor[];
  storageBaseUrl: string | null;
  categorias: CategoriaEditor[];
  allModules: ModuleEditor[];
  storageUploadReady: boolean;
}) {
  const [items, setItems] = useState(banners);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(banners);
  }, [banners]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => void reorderBanners(next.map((item) => item.id)));
  }

  if (!items.length) {
    return (
      <div className="flex min-h-[170px] items-center justify-center rounded-lg border border-dashed border-white/15 text-sm text-white/50">
        Nenhum banner cadastrado ainda.
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
        <div className="module-shelf flex snap-x gap-4 overflow-x-auto pb-5 data-[pending=true]:opacity-80" data-pending={pending}>
          {items.map((banner) => (
            <SortableBanner key={banner.id} banner={banner} storageBaseUrl={storageBaseUrl} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function NewBannerDialog({
  categorias,
  allModules,
  storageUploadReady
}: {
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
          <Field label="Imagem do banner (1280 x 360)">
            <FileInput name="bannerFile" disabled={!storageUploadReady} />
          </Field>
          <Field label="URL da imagem">
            <TextInput name="imageUrl" placeholder="Opcional se enviar arquivo" />
          </Field>
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

function CategoriaCard({ categoria, storageBaseUrl }: { categoria: CategoriaEditor; storageBaseUrl: string | null }) {
  const coverUrl = assetUrl(categoria.coverImagePath, storageBaseUrl);
  return (
    <div className="group relative h-[220px] w-[280px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#151019] shadow-xl transition hover:border-[#8A1DEE]/60">
      {coverUrl ? <Image src={coverUrl} alt={categoria.title} fill sizes="280px" className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(138,29,238,.55),transparent_35%),linear-gradient(145deg,#08050d,#1a1023_55%,#050306)]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#8A1DEE]">{categoria.status}</p>
        <h3 className="mt-2 line-clamp-2 break-words text-xl font-black leading-tight text-white">{categoria.title}</h3>
        <p className="mt-2 text-xs text-white/62">{categoria.modules.length} modulos</p>
      </div>
    </div>
  );
}

function ModuleCard({ module, storageBaseUrl }: { module: ModuleEditor; storageBaseUrl: string | null }) {
  const coverUrl = assetUrl(module.coverImagePath, storageBaseUrl);
  const showText = !module.hideText;

  return (
    <div className="group relative h-[292px] w-[220px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#151019] text-left shadow-xl transition hover:border-[#8A1DEE]/60">
      {coverUrl ? <Image src={coverUrl} alt={module.title || "Modulo"} fill sizes="220px" className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(138,29,238,.55),transparent_35%),linear-gradient(145deg,#08050d,#1a1023_55%,#050306)]" />}
      {showText ? <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/10" /> : null}
      {module.status !== "PUBLISHED" ? (
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

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-70" : undefined}>
      <div className="relative">
        <button type="button" aria-label="Arrastar" className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center text-white/75 hover:text-white" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function CategoriaSettingsDialog({ categoria, storageUploadReady }: { categoria: CategoriaEditor; storageUploadReady: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8" type="button">
          <Edit3 className="h-4 w-4 text-[#8A1DEE]" />
          Editar categoria
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Editar categoria</DialogTitle>
        <form action={updateCategoria} className="grid gap-4">
          <input type="hidden" name="id" value={categoria.id} />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <Field label="Titulo">
              <TextInput name="title" defaultValue={categoria.title} />
            </Field>
            <Field label="Ordem">
              <TextInput name="order" type="number" defaultValue={categoria.order} />
            </Field>
          </div>
          <Field label="Descricao">
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
          <Button type="submit" className="w-fit">
            <Save className="h-4 w-4" />
            Salvar categoria
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddModuleDialog({ categoria, allModules, storageUploadReady }: { categoria: CategoriaEditor; allModules: ModuleEditor[]; storageUploadReady: boolean }) {
  const movableModules = allModules.filter((module) => module.categoriaId !== categoria.id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8" type="button">
          <Plus className="h-4 w-4 text-[#8A1DEE]" />
          Adicionar modulo
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Adicionar modulo a {categoria.title}</DialogTitle>
        <form action={createModule} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <input type="hidden" name="categoriaId" value={categoria.id} />
          <Field label="Titulo do novo modulo">
            <TextInput name="title" />
          </Field>
          <Field label="Objetivo">
            <TextArea name="objective" rows={2} />
          </Field>
          <ToggleField name="hideText" label="Ocultar texto" />
          <Field label="Capa do modulo">
            <FileInput name="coverFile" disabled={!storageUploadReady} />
          </Field>
          <Button type="submit" className="w-fit">
            <Save className="h-4 w-4" />
            Criar modulo
          </Button>
        </form>

        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-bold">Mover modulo existente</h3>
          {movableModules.length ? (
            movableModules.map((module) => (
              <form key={module.id} action={moveModuleToCategoria} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-black/20 p-3">
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="categoriaId" value={categoria.id} />
                <span className="break-words text-sm font-bold">{module.title || `Modulo ${module.number}`}</span>
                <Button type="submit" size="sm">Mover para cá</Button>
              </form>
            ))
          ) : (
            <p className="text-sm text-white/55">Nao ha modulos em outras categorias.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RemoveModuleDialog({ categoria }: { categoria: CategoriaEditor }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8" type="button">
          <EyeOff className="h-4 w-4 text-[#8A1DEE]" />
          Remover modulo
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Remover modulo de {categoria.title}</DialogTitle>
        <div className="space-y-3">
          {categoria.modules.length ? (
            categoria.modules.map((module) => (
              <div key={module.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="break-words font-bold">{module.title || `Modulo ${module.number}`}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={removeModuleFromCategoria}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="mode" value="move" />
                    <Button type="submit" size="sm" variant="secondary">Mover para Geral</Button>
                  </form>
                  <form action={removeModuleFromCategoria}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="mode" value="delete" />
                    <Button type="submit" size="sm" variant="destructive">Excluir definitivamente</Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/55">Esta categoria ainda nao tem modulos.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoriaDialog({ categoria }: { categoria: CategoriaEditor }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-red-100 hover:bg-red-500/10" type="button">
          <Trash2 className="h-4 w-4 text-red-300" />
          Excluir categoria
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
        <AlertDialogDescription>
          Escolha o que fazer com os modulos dentro de {categoria.title}. Mover para Geral preserva aulas e progresso. Excluir definitivamente remove modulos, aulas e progresso associado.
        </AlertDialogDescription>
        <div className="flex flex-wrap gap-3">
          <form action={deleteCategoria}>
            <input type="hidden" name="id" value={categoria.id} />
            <input type="hidden" name="mode" value="move" />
            <AlertDialogAction asChild>
              <Button type="submit" variant="secondary">Mover modulos para Geral</Button>
            </AlertDialogAction>
          </form>
          <form action={deleteCategoria}>
            <input type="hidden" name="id" value={categoria.id} />
            <input type="hidden" name="mode" value="delete" />
            <AlertDialogAction asChild>
              <Button type="submit" variant="destructive">Excluir tudo</Button>
            </AlertDialogAction>
          </form>
          <AlertDialogCancel className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-[#F5F3F3] hover:bg-white/12">
            Cancelar
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CategoriaMenu({ categoria, allModules, storageUploadReady }: { categoria: CategoriaEditor; allModules: ModuleEditor[]; storageUploadReady: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-30">
      <button type="button" aria-label="Abrir opcoes" className="flex h-8 w-8 items-center justify-center text-white transition hover:text-[#8A1DEE]" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="h-6 w-6" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 w-56 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl">
          <CategoriaSettingsDialog categoria={categoria} storageUploadReady={storageUploadReady} />
          <AddModuleDialog categoria={categoria} allModules={allModules} storageUploadReady={storageUploadReady} />
          <RemoveModuleDialog categoria={categoria} />
          <DeleteCategoriaDialog categoria={categoria} />
        </div>
      ) : null}
    </div>
  );
}

function ModuleSettingsDialog({ module, storageBaseUrl, storageUploadReady }: { module: ModuleEditor; storageBaseUrl: string | null; storageUploadReady: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8" type="button">
          <Edit3 className="h-4 w-4 text-[#8A1DEE]" />
          Editar modulo
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogTitle>Editar modulo</DialogTitle>
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <ModuleCard module={module} storageBaseUrl={storageBaseUrl} />
            <div className="flex flex-wrap gap-2">
              <ConfirmActionButton label={module.status === "PUBLISHED" ? "Ocultar" : "Publicar"} icon={module.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} action={() => updateModuleStatus(module.id, module.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED")} />
              <ConfirmActionButton label="Excluir" icon={<Trash2 className="h-4 w-4" />} variant="destructive" confirmText="Excluir este modulo e todas as aulas/progressos associados?" action={() => deleteModule(module.id)} />
            </div>
          </div>
          <form action={updateModule} className="grid min-w-0 gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <input type="hidden" name="id" value={module.id} />
            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
              <Field label="Titulo">
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
            <Field label="Capa do modulo">
              <FileInput name="coverFile" disabled={!storageUploadReady} />
            </Field>
            <Button type="submit" className="w-fit">
              <Save className="h-4 w-4" />
              Salvar modulo
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModuleMenu({ module, storageBaseUrl, storageUploadReady }: { module: ModuleEditor; storageBaseUrl: string | null; storageUploadReady: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-3 top-3 z-30">
      <button type="button" aria-label="Abrir opcoes" className="flex h-8 w-8 items-center justify-center text-white transition hover:text-[#8A1DEE]" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="h-6 w-6" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 w-48 rounded-lg border border-white/10 bg-[#151019] p-1 shadow-2xl">
          <Link href={`/admin/conteudo/${module.id}`} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-white/86 hover:bg-white/8">
            <BookOpen className="h-4 w-4 text-[#8A1DEE]" />
            Editar conteudo
          </Link>
          <ModuleSettingsDialog module={module} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />
        </div>
      ) : null}
    </div>
  );
}

function SortableCategoria({ categoria, storageBaseUrl, allModules, storageUploadReady }: { categoria: CategoriaEditor; storageBaseUrl: string | null; allModules: ModuleEditor[]; storageUploadReady: boolean }) {
  return (
    <SortableCard id={categoria.id}>
      <CategoriaCard categoria={categoria} storageBaseUrl={storageBaseUrl} />
      <CategoriaMenu categoria={categoria} allModules={allModules} storageUploadReady={storageUploadReady} />
    </SortableCard>
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

function CategoriaShelf({ courseId, categorias, storageBaseUrl, allModules, storageUploadReady }: { courseId: string; categorias: CategoriaEditor[]; storageBaseUrl: string | null; allModules: ModuleEditor[]; storageUploadReady: boolean }) {
  const [items, setItems] = useState(categorias);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(categorias);
  }, [categorias]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => void reorderCategorias(courseId, next.map((item) => item.id)));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
        <div className="module-shelf flex snap-x gap-4 overflow-x-auto pb-5 data-[pending=true]:opacity-80" data-pending={pending}>
          {items.map((categoria) => (
            <SortableCategoria key={categoria.id} categoria={categoria} storageBaseUrl={storageBaseUrl} allModules={allModules} storageUploadReady={storageUploadReady} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ModuleShelf({ categoria, storageBaseUrl, storageUploadReady }: { categoria: CategoriaEditor; storageBaseUrl: string | null; storageUploadReady: boolean }) {
  const [items, setItems] = useState(categoria.modules);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(categoria.modules);
  }, [categoria.modules]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => void reorderModules(categoria.id, next.map((item) => item.id)));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
        <div className="module-shelf flex snap-x gap-4 overflow-x-auto pb-5 data-[pending=true]:opacity-80" data-pending={pending}>
          {items.length ? (
            items.map((module) => <SortableModule key={module.id} module={module} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />)
          ) : (
            <div className="flex h-[180px] w-full items-center justify-center rounded-lg border border-dashed border-white/15 text-sm text-white/50">Categoria vazia</div>
          )}
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

export function CourseContentEditor({ course, banners, categorias, allModules, storageBaseUrl, storageUploadReady }: CourseContentEditorProps) {
  const totalLessons = allModules.reduce((sum, module) => sum + module.lessonCount, 0);
  const publishedCategorias = categorias.filter((categoria) => categoria.status === "PUBLISHED").length;
  const activeBanners = banners.filter((banner) => banner.status === "ACTIVE").length;

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Editor de conteudo</p>
          <h1 className="mt-2 break-words text-4xl font-bold">Categorias e modulos</h1>
          <p className="mt-3 break-words text-white/62">Curso &gt; Categoria &gt; Modulo &gt; Aula. Categorias organizam modulos, modulos organizam aulas.</p>
        </div>
        <NewCategoryDialog courseId={course.id} storageUploadReady={storageUploadReady} />
      </header>

      {!storageUploadReady ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
          Upload de imagens desativado: falta configurar SUPABASE_SERVICE_ROLE_KEY no ambiente local e na Vercel.
        </div>
      ) : null}

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Banners da area de membros</h2>
            <p className="mt-1 text-sm text-white/55">Arraste para reordenar. Use os tres pontos para editar, ativar, desativar ou excluir.</p>
          </div>
          <NewBannerDialog categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
        </div>
        <BannerShelf banners={banners} storageBaseUrl={storageBaseUrl} categorias={categorias} allModules={allModules} storageUploadReady={storageUploadReady} />
      </section>

      <section className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,.55fr)]">
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

      <section className="min-w-0">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Categorias do curso</h2>
          <p className="mt-1 text-sm text-white/55">Arraste para reordenar. Use os tres pontos para editar, adicionar, remover ou excluir.</p>
        </div>
        <CategoriaShelf courseId={course.id} categorias={categorias} storageBaseUrl={storageBaseUrl} allModules={allModules} storageUploadReady={storageUploadReady} />
      </section>

      <section className="space-y-8">
        {categorias.map((categoria) => (
          <div key={categoria.id} className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{categoria.title}</h2>
                {categoria.description ? <p className="mt-1 text-sm text-white/55">{categoria.description}</p> : null}
              </div>
              <span className="text-sm text-white/45">{categoria.modules.length} modulos</span>
            </div>
            <ModuleShelf categoria={categoria} storageBaseUrl={storageBaseUrl} storageUploadReady={storageUploadReady} />
          </div>
        ))}
      </section>
    </div>
  );
}
