import Image from "next/image";
import { AlertTriangle, Info, Lightbulb, Sparkles } from "lucide-react";
import { LessonChecklist } from "@/components/student/checklist";
import { resolveAssetUrl } from "@/lib/assets";
import { listItemsFromBlock, type BlockSettings, type LessonBlockDTO } from "@/lib/lesson-blocks";
import { cn } from "@/lib/utils";

export type RenderableBlock = Pick<
  LessonBlockDTO,
  "id" | "type" | "order" | "content" | "imagePath" | "imageCaption" | "isVisible" | "settings"
>;

type ChecklistItem = { id: string; text: string };

export function LessonBlockRenderer({
  blocks,
  checklistItems = [],
  checkedIds = [],
  mode = "student",
  className
}: {
  blocks: RenderableBlock[];
  checklistItems?: ChecklistItem[];
  checkedIds?: string[];
  /** student: interactive checklist; preview: read-only checklist */
  mode?: "student" | "preview";
  className?: string;
}) {
  const visible = blocks.filter((block) => block.isVisible !== false);

  if (!visible.length) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/45">
        Nenhum bloco de conteúdo visível nesta aula.
      </p>
    );
  }

  return (
    <div className={cn("space-y-10", className)}>
      {visible.map((block) => (
        <BlockView
          key={block.id}
          block={block}
          checklistItems={checklistItems}
          checkedIds={checkedIds}
          mode={mode}
        />
      ))}
    </div>
  );
}

function BlockView({
  block,
  checklistItems,
  checkedIds,
  mode
}: {
  block: RenderableBlock;
  checklistItems: ChecklistItem[];
  checkedIds: string[];
  mode: "student" | "preview";
}) {
  const settings = block.settings || {};

  switch (block.type) {
    case "HEADING":
    case "SUBHEADING":
      return <HeadingBlock content={block.content} settings={settings} prefer={block.type} />;
    case "TEXT":
      return <ParagraphBlock content={block.content} />;
    case "STEP":
      return <StepBlock order={block.order} content={block.content} imagePath={block.imagePath} imageCaption={block.imageCaption} settings={settings} />;
    case "IMAGE":
      return <ImageBlock imagePath={block.imagePath} imageCaption={block.imageCaption} settings={settings} content={block.content} />;
    case "TIP":
    case "WARNING":
    case "INFO":
    case "EXAMPLE":
      return <CalloutBlock type={block.type} content={block.content} settings={settings} />;
    case "BULLET_LIST":
      return <ListBlock content={block.content} settings={settings} ordered={false} />;
    case "NUMBERED_LIST":
      return <ListBlock content={block.content} settings={settings} ordered />;
    case "DIVIDER":
      return <hr className="border-0 border-t border-white/10" />;
    case "CHECKLIST":
      return (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-xl">
              {settings.title || block.content || "Checklist de conclusão"}
            </h2>
            {mode === "preview" ? (
              <p className="text-sm text-white/45">Pré-visualização — progresso não é alterado.</p>
            ) : (
              <p className="text-sm text-white/50">Marque o que você já validou nesta aula.</p>
            )}
          </div>
          {mode === "preview" ? (
            <ul className="space-y-2">
              {checklistItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-3 text-sm text-white/70"
                >
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/25" />
                  <span className="min-w-0 break-words">{item.text}</span>
                </li>
              ))}
              {!checklistItems.length ? (
                <li className="text-sm text-white/40">Nenhum item de checklist nesta aula.</li>
              ) : null}
            </ul>
          ) : (
            <LessonChecklist items={checklistItems} checkedIds={checkedIds} />
          )}
        </section>
      );
    case "CHECKBOX": {
      const itemId = settings.checklistItemId;
      const item = itemId ? checklistItems.find((i) => i.id === itemId) : null;
      const text = item?.text || block.content;
      if (mode === "preview") {
        return (
          <div className="flex items-start gap-3 rounded-lg px-1 py-2 text-sm text-white/75">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/25" />
            <span className="min-w-0 break-words leading-relaxed">{text}</span>
          </div>
        );
      }
      if (item) {
        return <LessonChecklist items={[item]} checkedIds={checkedIds.filter((id) => id === item.id)} />;
      }
      return (
        <p className="text-sm text-white/55">{text}</p>
      );
    }
    default:
      return <ParagraphBlock content={block.content} />;
  }
}

function HeadingBlock({
  content,
  settings,
  prefer
}: {
  content: string;
  settings: BlockSettings;
  prefer: "HEADING" | "SUBHEADING";
}) {
  const level = settings.level || (prefer === "HEADING" ? 2 : 3);
  const align =
    settings.align === "center" ? "text-center" : settings.align === "right" ? "text-right" : "text-left";

  if (level === 3) {
    return (
      <h3 className={cn("break-words text-lg font-semibold tracking-tight text-white sm:text-xl", align)}>
        {content}
      </h3>
    );
  }
  return (
    <h2 className={cn("break-words text-xl font-semibold tracking-tight text-white sm:text-2xl", align)}>
      {content}
    </h2>
  );
}

function ParagraphBlock({ content }: { content: string }) {
  const parts = content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return <p className="break-words text-[15px] leading-[1.75] text-white/78 sm:text-base">{content}</p>;
  }

  return (
    <div className="space-y-3">
      {parts.map((part, index) => (
        <p key={index} className="break-words text-[15px] leading-[1.75] text-white/78 sm:text-base">
          {part}
        </p>
      ))}
    </div>
  );
}

function StepBlock({
  order,
  content,
  imagePath,
  imageCaption,
  settings
}: {
  order: number;
  content: string;
  imagePath?: string | null;
  imageCaption?: string | null;
  settings: BlockSettings;
}) {
  const url = resolveAssetUrl(imagePath);
  return (
    <div className="flex min-w-0 gap-3 sm:gap-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8A1DEE] text-xs font-bold text-white sm:h-8 sm:w-8 sm:text-sm">
        {order}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <ParagraphBlock content={content} />
        {url ? (
          <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <Image
              src={url}
              alt={imageCaption || settings.alt || content}
              width={1280}
              height={720}
              sizes="(min-width: 1280px) 880px, 100vw"
              className="max-h-[560px] w-full object-contain"
            />
            {imageCaption ? (
              <figcaption className="break-words border-t border-white/5 px-3 py-2.5 text-sm text-white/50">
                {imageCaption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </div>
  );
}

function ImageBlock({
  imagePath,
  imageCaption,
  settings,
  content
}: {
  imagePath?: string | null;
  imageCaption?: string | null;
  settings: BlockSettings;
  content: string;
}) {
  const url = resolveAssetUrl(imagePath);
  if (!url) return null;

  const widthClass =
    settings.width === "sm"
      ? "max-w-sm"
      : settings.width === "md"
        ? "max-w-xl"
        : settings.width === "lg"
          ? "max-w-3xl"
          : "max-w-full";

  const alignClass =
    settings.align === "center" ? "mx-auto" : settings.align === "right" ? "ml-auto" : "";

  return (
    <figure className={cn("overflow-hidden rounded-xl border border-white/10 bg-black/20", widthClass, alignClass)}>
      <Image
        src={url}
        alt={settings.alt || imageCaption || content || "Imagem da aula"}
        width={1280}
        height={720}
        sizes="(min-width: 1280px) 880px, 100vw"
        className="max-h-[560px] w-full object-contain"
      />
      {imageCaption ? (
        <figcaption className="break-words border-t border-white/5 px-3 py-2.5 text-sm text-white/50">
          {imageCaption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function CalloutBlock({
  type,
  content,
  settings
}: {
  type: "TIP" | "WARNING" | "INFO" | "EXAMPLE";
  content: string;
  settings: BlockSettings;
}) {
  const config = {
    TIP: {
      label: settings.title || "Dica",
      icon: Lightbulb,
      className: "border-l-[#8A1DEE] bg-[#8A1DEE]/[0.07] text-[#c4a0f7]"
    },
    WARNING: {
      label: settings.title || "Atenção",
      icon: AlertTriangle,
      className: "border-l-amber-400/80 bg-amber-400/[0.07] text-amber-200"
    },
    INFO: {
      label: settings.title || "Informação",
      icon: Info,
      className: "border-l-sky-400/80 bg-sky-400/[0.07] text-sky-200"
    },
    EXAMPLE: {
      label: settings.title || "Exemplo prático",
      icon: Sparkles,
      className: "border-l-emerald-400/70 bg-emerald-400/[0.07] text-emerald-200"
    }
  }[type];

  const Icon = config.icon;

  return (
    <aside className={cn("rounded-r-xl border border-transparent border-l-[3px] px-4 py-4 sm:px-5 sm:py-5", config.className)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span>{config.label}</span>
      </div>
      <div className="text-white/80">
        <ParagraphBlock content={content} />
      </div>
    </aside>
  );
}

function ListBlock({
  content,
  settings,
  ordered
}: {
  content: string;
  settings: BlockSettings;
  ordered: boolean;
}) {
  const items = listItemsFromBlock(content, settings);
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("space-y-2 pl-5 text-[15px] leading-[1.75] text-white/78 sm:text-base", ordered ? "list-decimal" : "list-disc")}>
      {items.map((item, index) => (
        <li key={index} className="break-words pl-1">
          {item}
        </li>
      ))}
    </Tag>
  );
}
