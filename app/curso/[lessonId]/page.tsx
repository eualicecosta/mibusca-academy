import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, ImageIcon, Lightbulb, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LessonBlockRenderer } from "@/components/lesson/lesson-block-renderer";
import { RolePreviewBanner } from "@/components/role-preview-banner";
import { CourseSidebar } from "@/components/student/course-sidebar";
import { LessonChecklist } from "@/components/student/checklist";
import { LessonActions } from "@/components/student/lesson-actions";
import { MobileCourseNav } from "@/components/student/mobile-course-nav";
import { Progress } from "@/components/ui/progress";
import { resolveAssetUrl } from "@/lib/assets";
import { requireApprovedStudent } from "@/lib/auth";
import { getLessonContentForStudent, getStudentCourse } from "@/lib/course";
import { parseBlockSettings } from "@/lib/lesson-blocks";
import { buildWhatsAppUrl, getSupportSettings } from "@/lib/support";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudentCourse = Awaited<ReturnType<typeof getStudentCourse>>;
type FlatLesson = StudentCourse["flatLessons"][number];
type LessonContent = Awaited<ReturnType<typeof getLessonContentForStudent>>;

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const pageStartedAt = process.env.NODE_ENV === "development" ? performance.now() : 0;
  const { lessonId } = await params;
  const profile = await requireApprovedStudent();
  const support = await getSupportSettings();
  const supportHref =
    support.supportEnabled && support.supportWhatsApp
      ? buildWhatsAppUrl(support.supportWhatsApp, support.supportDefaultMessage)
      : null;

  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] lessonPage.auth ${Math.round(performance.now() - pageStartedAt)}ms`);
  }

  return (
    <AppShell
      showAdmin={profile.actualRole === "ADMIN"}
      isRolePreview={profile.isRolePreview}
      userName={profile.name}
      userEmail={profile.email}
      supportHref={supportHref}
      previewBanner={profile.isRolePreview ? <RolePreviewBanner asRole="STUDENT" /> : null}
      fillViewport
      headerClassName="z-40"
      mainClassName="px-0 py-0 pb-0 md:pl-[72px] md:pr-0"
    >
      <Suspense fallback={<LessonShellSkeleton />}>
        <LessonShell userId={profile.id} lessonId={lessonId} />
      </Suspense>
    </AppShell>
  );
}

async function LessonShell({ userId, lessonId }: { userId: string; lessonId: string }) {
  const shellStartedAt = process.env.NODE_ENV === "development" ? performance.now() : 0;

  // Start lesson body fetch in parallel with course structure (no sequential locks).
  const contentPromise = getLessonContentForStudent(userId, lessonId);
  const data = await getStudentCourse(userId);
  const currentIndex = data.flatLessons.findIndex((lesson) => lesson.id === lessonId);
  const current = currentIndex >= 0 ? data.flatLessons[currentIndex] : null;

  if (!current) {
    // Unpublished / hidden / unknown lessons stay inaccessible.
    notFound();
  }

  // Previous / next only within the current module's published order.
  const moduleLessons = data.flatLessons.filter((lesson) => lesson.moduleId === current.moduleId);
  const moduleIndex = moduleLessons.findIndex((lesson) => lesson.id === lessonId);
  const previous = moduleIndex > 0 ? moduleLessons[moduleIndex - 1] : null;
  const next =
    moduleIndex >= 0 && moduleIndex < moduleLessons.length - 1 ? moduleLessons[moduleIndex + 1] : null;
  const moduleProgress = data.modules.find((module) => module.id === current.moduleId);

  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] lessonPage.shell ${Math.round(performance.now() - shellStartedAt)}ms`);
  }

  return (
    <div className="lesson-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:grid xl:grid-cols-[minmax(280px,440px)_minmax(0,1fr)]">
      {/* Mobile: collapsible course nav — single document column scroll */}
      <div className="z-30 shrink-0 border-b border-white/10 bg-[#09070d]/95 p-3 backdrop-blur xl:hidden">
        <MobileCourseNav>
          <CourseSidebar
            categorias={data.categorias}
            currentLessonId={lessonId}
            className="max-h-[calc(100dvh-6rem)] border-0 bg-transparent"
          />
        </MobileCourseNav>
      </div>

      {/* Desktop: independent vertical scroll for course tree */}
      <aside className="course-sidebar hidden min-h-0 overflow-x-hidden overflow-y-scroll border-r border-white/10 bg-[#121018] xl:block">
        <CourseSidebar
          categorias={data.categorias}
          currentLessonId={lessonId}
          showHeading
          className="max-h-none min-h-0 overflow-visible rounded-none border-0 bg-transparent"
        />
      </aside>

      {/* Document column — sole owner of main lesson scroll */}
      <div className="lesson-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-scroll overscroll-contain">
        <Suspense fallback={<LessonArticleSkeleton />}>
          <LessonArticle
            contentPromise={contentPromise}
            current={current}
            previous={previous}
            next={next}
            totalLessons={data.totalLessons}
            completedLessons={data.completedLessons}
            modulePercent={moduleProgress?.percent || 0}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function LessonArticle({
  contentPromise,
  current,
  previous,
  next,
  totalLessons,
  completedLessons,
  modulePercent
}: {
  contentPromise: Promise<LessonContent>;
  current: FlatLesson;
  previous: FlatLesson | null;
  next: FlatLesson | null;
  totalLessons: number;
  completedLessons: number;
  modulePercent: number;
}) {
  const articleStartedAt = process.env.NODE_ENV === "development" ? performance.now() : 0;
  const { lesson: detail, checked } = await contentPromise;

  if (!detail) {
    notFound();
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] lessonPage.article ${Math.round(performance.now() - articleStartedAt)}ms`);
  }

  const tipIsAttention = detail.tipKind === "Atencao";
  const checkedIds = checked.map((item) => item.checklistItemId);
  const showAutoTitle = detail.showAutoTitle !== false;
  const useBlockDocument = Boolean(detail.blocksMigrated);

  const documentBlocks = detail.blocks.map((block) => ({
    id: block.id,
    type: block.type,
    order: block.order,
    content: block.content,
    imagePath: block.imagePath,
    imageCaption: block.imageCaption,
    isVisible: block.isVisible !== false,
    settings: parseBlockSettings(block.settings)
  }));

  const hasChecklistBlock = documentBlocks.some((b) => b.isVisible && (b.type === "CHECKLIST" || b.type === "CHECKBOX"));

  return (
    <article className="mx-auto w-full min-w-0 max-w-[920px] px-4 py-6 pb-28 sm:px-6 sm:py-8 md:px-10 md:py-10 md:pb-20">
      <header className="space-y-4 border-b border-white/[0.08] pb-8">
        <nav
          aria-label="Localização da aula"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45 sm:text-sm"
        >
          <span className="font-medium text-[#b07af5]">{current.categoriaTitle}</span>
          <span aria-hidden className="text-white/25">
            /
          </span>
          <span>Módulo {current.moduleNumber}</span>
          <span aria-hidden className="text-white/25">
            /
          </span>
          <span>Aula {current.number}</span>
        </nav>

        {showAutoTitle ? (
          <h1 className="break-words font-bold tracking-tight text-white [font-size:clamp(1.75rem,4vw,2.75rem)] [line-height:1.2]">
            {detail.title}
          </h1>
        ) : (
          <h1 className="sr-only">{detail.title}</h1>
        )}

        <p className="text-sm leading-relaxed text-white/55">
          <span className="text-white/80">{totalLessons}</span> aulas
          <span className="mx-2 text-white/25" aria-hidden>
            ·
          </span>
          <span className="text-white/80">{completedLessons}</span> concluídas
          <span className="mx-2 text-white/25" aria-hidden>
            ·
          </span>
          <span className="text-white/80">{modulePercent}%</span> do módulo
        </p>

        <div className="max-w-sm space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-white/45">
            <span>Progresso do módulo</span>
            <span>{modulePercent}%</span>
          </div>
          <Progress value={modulePercent} className="h-1.5" />
        </div>
      </header>

      <div className="mt-10 space-y-12">
        {useBlockDocument ? (
          <>
            <LessonBlockRenderer
              blocks={documentBlocks}
              checklistItems={detail.checklistItems}
              checkedIds={checkedIds}
              mode="student"
            />
            {!hasChecklistBlock && detail.checklistItems.length ? (
              <section aria-labelledby="lesson-checklist" className="space-y-4">
                <div className="space-y-1">
                  <h2 id="lesson-checklist" className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-xl">
                    Checklist de conclusão
                  </h2>
                  <p className="text-sm text-white/50">Marque o que você já validou nesta aula.</p>
                </div>
                <LessonChecklist items={detail.checklistItems} checkedIds={checkedIds} />
              </section>
            ) : null}
          </>
        ) : (
          <>
            {detail.objective ? (
              <section aria-labelledby="lesson-objective">
                <div className="rounded-r-xl border border-transparent border-l-[3px] border-l-[#8A1DEE] bg-[#8A1DEE]/[0.08] px-4 py-4 sm:px-5 sm:py-5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#c4a0f7]">
                    <Target className="h-4 w-4 shrink-0" aria-hidden />
                    <h2 id="lesson-objective">Objetivo</h2>
                  </div>
                  <DocParagraphs text={detail.objective} className="text-white/80" />
                </div>
              </section>
            ) : null}

            {detail.context ? (
              <section aria-labelledby="lesson-context" className="space-y-3">
                <h2 id="lesson-context" className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-xl">
                  Contexto
                </h2>
                <DocParagraphs text={detail.context} className="text-white/72" />
              </section>
            ) : null}

            {detail.blocks.length > 0 ? (
              <section aria-labelledby="lesson-steps" className="space-y-6">
                <h2 id="lesson-steps" className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-xl">
                  Passo a passo
                </h2>
                <ol className="space-y-9">
                  {detail.blocks.map((block) => {
                    const url = resolveAssetUrl(block.imagePath);
                    return (
                      <li key={block.id} className="min-w-0">
                        <div className="flex min-w-0 gap-3 sm:gap-4">
                          <span
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8A1DEE] text-xs font-bold text-white sm:h-8 sm:w-8 sm:text-sm"
                            aria-hidden
                          >
                            {block.order}
                          </span>
                          <div className="min-w-0 flex-1 space-y-3 border-b border-white/[0.04] pb-8 last:border-b-0 last:pb-0">
                            <DocParagraphs text={block.content} className="text-white/80" />
                            {url ? (
                              <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                <Image
                                  src={url}
                                  alt={block.imageCaption || `Ilustração do passo ${block.order}`}
                                  width={1280}
                                  height={720}
                                  sizes="(min-width: 1280px) 880px, 100vw"
                                  className="max-h-[560px] w-full object-contain"
                                />
                                {block.imageCaption ? (
                                  <figcaption className="break-words border-t border-white/5 px-3 py-2.5 text-sm text-white/50">
                                    {block.imageCaption}
                                  </figcaption>
                                ) : null}
                              </figure>
                            ) : block.imagePath && process.env.NODE_ENV === "development" ? (
                              <p className="flex items-center gap-2 text-xs text-white/40">
                                <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="min-w-0 break-all">Asset pendente: {block.imagePath}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            {detail.tipText ? (
              <aside
                className={cn(
                  "rounded-r-xl border border-transparent border-l-[3px] px-4 py-4 sm:px-5 sm:py-5",
                  tipIsAttention
                    ? "border-l-amber-400/80 bg-amber-400/[0.07]"
                    : "border-l-[#8A1DEE] bg-[#8A1DEE]/[0.07]"
                )}
              >
                <div
                  className={cn(
                    "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]",
                    tipIsAttention ? "text-amber-200" : "text-[#c4a0f7]"
                  )}
                >
                  {tipIsAttention ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <span>{detail.tipKind || "Dica"}</span>
                </div>
                <DocParagraphs text={detail.tipText} className="text-white/75" />
              </aside>
            ) : null}

            {detail.checklistItems.length ? (
              <section aria-labelledby="lesson-checklist" className="space-y-4">
                <div className="space-y-1">
                  <h2 id="lesson-checklist" className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-xl">
                    Checklist de conclusão
                  </h2>
                  <p className="text-sm text-white/50">Marque o que você já validou nesta aula.</p>
                </div>
                <LessonChecklist items={detail.checklistItems} checkedIds={checkedIds} />
              </section>
            ) : null}
          </>
        )}

        <section aria-labelledby="lesson-complete" className="space-y-5 border-t border-white/[0.08] pt-10">
          <div className="space-y-1">
            <h2 id="lesson-complete" className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-xl">
              Concluir esta aula
            </h2>
            <p className="text-sm text-white/50">
              {current.completed
                ? "Você já concluiu esta aula. Pode seguir para a próxima quando quiser."
                : "Marque a aula como concluída para liberar o progresso e a próxima na sequência."}
            </p>
          </div>
          <LessonActions
            lessonId={current.id}
            previousId={previous?.id}
            previousTitle={previous?.title}
            nextId={next?.id}
            nextTitle={next?.title}
            completed={current.completed}
            modulesHref="/dashboard"
          />
        </section>
      </div>
    </article>
  );
}

/** Split stored text into readable paragraphs without changing source content. */
function DocParagraphs({ text, className }: { text: string; className?: string }) {
  const parts = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return (
      <p className={cn("break-words text-[15px] leading-[1.75] sm:text-base", className)}>{text}</p>
    );
  }

  return (
    <div className="space-y-3">
      {parts.map((part, index) => (
        <p key={index} className={cn("break-words text-[15px] leading-[1.75] sm:text-base", className)}>
          {part}
        </p>
      ))}
    </div>
  );
}

function LessonShellSkeleton() {
  return (
    <div
      className="lesson-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:grid xl:grid-cols-[minmax(280px,440px)_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Carregando aula"
    >
      <div className="h-14 shrink-0 animate-pulse border-b border-white/10 bg-white/[0.04] xl:hidden" />
      <div className="course-sidebar hidden min-h-0 animate-pulse border-r border-white/10 bg-white/[0.03] xl:block" />
      <div className="lesson-main min-h-0 flex-1 overflow-y-scroll px-4 py-6 sm:px-6 md:px-10">
        <LessonArticleSkeleton />
      </div>
    </div>
  );
}

function LessonArticleSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[920px] space-y-6" aria-hidden>
      <div className="h-3.5 w-52 animate-pulse rounded bg-white/[0.05]" />
      <div className="h-10 w-full max-w-xl animate-pulse rounded bg-white/[0.07]" />
      <div className="h-4 w-64 animate-pulse rounded bg-white/[0.04]" />
      <div className="h-1.5 max-w-sm animate-pulse rounded-full bg-white/[0.05]" />
      <div className="h-24 animate-pulse rounded-r-xl border-l-[3px] border-l-[#8A1DEE]/50 bg-[#8A1DEE]/[0.06]" />
      <div className="h-16 animate-pulse rounded bg-white/[0.03]" />
      <div className="h-48 animate-pulse rounded bg-white/[0.04]" />
    </div>
  );
}
