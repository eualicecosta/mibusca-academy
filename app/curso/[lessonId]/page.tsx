import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, ImageIcon, Lightbulb, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RolePreviewBanner } from "@/components/role-preview-banner";
import { CourseSidebar } from "@/components/student/course-sidebar";
import { LessonChecklist } from "@/components/student/checklist";
import { LessonActions } from "@/components/student/lesson-actions";
import { MobileCourseNav } from "@/components/student/mobile-course-nav";
import { Progress } from "@/components/ui/progress";
import { resolveAssetUrl } from "@/lib/assets";
import { requireApprovedStudent } from "@/lib/auth";
import { getLessonContentForStudent, getStudentCourse } from "@/lib/course";
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
      className="h-dvh overflow-hidden"
      headerClassName="z-40 shrink-0"
      mainClassName="h-[calc(100dvh-72px)] min-h-0 overflow-hidden px-0 py-0 md:pl-[72px] md:pr-0"
    >
      <Suspense fallback={<LessonShellSkeleton />}>
        <LessonShell userId={profile.id} lessonId={lessonId} />
      </Suspense>
    </AppShell>
  );
}

async function LessonShell({ userId, lessonId }: { userId: string; lessonId: string }) {
  const shellStartedAt = process.env.NODE_ENV === "development" ? performance.now() : 0;

  // Start lesson body fetch in parallel with course structure + lock computation.
  // Content is only rendered after the lock check below.
  const contentPromise = getLessonContentForStudent(userId, lessonId);
  const data = await getStudentCourse(userId);
  const currentIndex = data.flatLessons.findIndex((lesson) => lesson.id === lessonId);
  const current = currentIndex >= 0 ? data.flatLessons[currentIndex] : null;

  if (!current) {
    notFound();
  }
  if (current.locked) {
    redirect("/dashboard");
  }

  const previous = currentIndex > 0 ? data.flatLessons[currentIndex - 1] : null;
  const next = currentIndex < data.flatLessons.length - 1 ? data.flatLessons[currentIndex + 1] : null;
  const moduleProgress = data.modules.find((module) => module.id === current.moduleId);

  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] lessonPage.shell ${Math.round(performance.now() - shellStartedAt)}ms`);
  }

  return (
    <div className="lesson-shell flex h-full min-h-0 min-w-0 flex-col overflow-hidden xl:grid xl:grid-cols-[minmax(280px,440px)_minmax(0,1fr)]">
      {/* Mobile: collapsible course nav — single page scroll on the document column */}
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
      <aside className="course-sidebar hidden h-full min-h-0 overflow-x-hidden overflow-y-scroll border-r border-white/10 bg-[#121018] xl:block">
        <CourseSidebar
          categorias={data.categorias}
          currentLessonId={lessonId}
          showHeading
          className="max-h-none min-h-0 overflow-visible rounded-none border-0 bg-transparent"
        />
      </aside>

      {/* Desktop + mobile document: sole owner of main lesson scroll (always paint scrollbar track) */}
      <div className="lesson-main h-full min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-scroll overscroll-contain">
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

  return (
    <article className="mx-auto w-full min-w-0 max-w-[920px] px-4 py-6 pb-28 sm:px-6 sm:py-8 md:px-8 md:py-10 md:pb-16">
      {/* Document header */}
      <header className="space-y-4 border-b border-white/[0.08] pb-8">
        <nav aria-label="Localização da aula" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45 sm:text-sm">
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

        <h1 className="break-words font-bold tracking-tight text-white [font-size:clamp(1.75rem,4vw,2.75rem)] [line-height:1.2]">
          {detail.title}
        </h1>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/55">
          <span>
            <strong className="font-semibold text-white/80">{totalLessons}</strong> aulas
          </span>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <span>
            <strong className="font-semibold text-white/80">{completedLessons}</strong> concluídas
          </span>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <span>
            <strong className="font-semibold text-white/80">{modulePercent}%</strong> do módulo
          </span>
        </p>

        <div className="max-w-md space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/45">
            <span>Progresso do módulo</span>
            <span>{modulePercent}%</span>
          </div>
          <Progress value={modulePercent} className="h-1.5" />
        </div>
      </header>

      {/* Continuous document body */}
      <div className="mt-8 space-y-10">
        {detail.objective ? (
          <section aria-labelledby="lesson-objective">
            <div className="rounded-xl border border-[#8A1DEE]/25 border-l-[3px] border-l-[#8A1DEE] bg-[#8A1DEE]/[0.07] px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#c4a0f7]">
                <Target className="h-4 w-4 shrink-0" aria-hidden />
                <h2 id="lesson-objective">Objetivo</h2>
              </div>
              <p className="break-words text-[15px] leading-[1.75] text-white/78 sm:text-base">{detail.objective}</p>
            </div>
          </section>
        ) : null}

        {detail.context ? (
          <section aria-labelledby="lesson-context" className="space-y-3">
            <h2 id="lesson-context" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              Contexto
            </h2>
            <p className="break-words text-[15px] leading-[1.75] text-white/72 sm:text-base">{detail.context}</p>
          </section>
        ) : null}

        {detail.blocks.length > 0 ? (
          <section aria-labelledby="lesson-steps" className="space-y-5">
            <h2 id="lesson-steps" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              Passo a passo
            </h2>
            <ol className="space-y-8">
              {detail.blocks.map((block) => {
                const url = resolveAssetUrl(block.imagePath);
                return (
                  <li key={block.id} className="min-w-0">
                    <div className="flex min-w-0 gap-3 sm:gap-4">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8A1DEE]/90 text-xs font-bold text-white sm:h-8 sm:w-8 sm:text-sm"
                        aria-hidden
                      >
                        {block.order}
                      </span>
                      <div className="min-w-0 flex-1 space-y-3">
                        <p className="break-words text-[15px] leading-[1.75] text-white/80 sm:text-base">{block.content}</p>
                        {url ? (
                          <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                            <Image
                              src={url}
                              alt={block.imageCaption || block.content}
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
              "rounded-xl border px-4 py-4 sm:px-5 sm:py-5",
              tipIsAttention
                ? "border-amber-400/30 bg-amber-400/[0.06]"
                : "border-[#8A1DEE]/25 bg-[#8A1DEE]/[0.06]"
            )}
          >
            <div
              className={cn(
                "mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide",
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
            <p className="break-words text-[15px] leading-[1.75] text-white/75 sm:text-base">{detail.tipText}</p>
          </aside>
        ) : null}

        {detail.checklistItems.length ? (
          <section aria-labelledby="lesson-checklist" className="space-y-4">
            <div className="space-y-1">
              <h2 id="lesson-checklist" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Checklist de conclusão
              </h2>
              <p className="text-sm text-white/50">Marque o que você já validou nesta aula.</p>
            </div>
            <LessonChecklist items={detail.checklistItems} checkedIds={checked.map((item) => item.checklistItemId)} />
          </section>
        ) : null}

        <section
          aria-labelledby="lesson-complete"
          className="space-y-5 border-t border-white/[0.08] pt-8"
        >
          <div className="space-y-1">
            <h2 id="lesson-complete" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
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
            previousId={previous?.locked ? undefined : previous?.id}
            previousTitle={previous && !previous.locked ? previous.title : undefined}
            nextId={next?.locked ? undefined : next?.id}
            nextTitle={next && !next.locked ? next.title : undefined}
            completed={current.completed}
          />
        </section>
      </div>
    </article>
  );
}

function LessonShellSkeleton() {
  return (
    <div
      className="lesson-shell flex h-full min-h-0 min-w-0 flex-col overflow-hidden xl:grid xl:grid-cols-[minmax(280px,440px)_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Carregando aula"
    >
      <div className="h-14 shrink-0 animate-pulse border-b border-white/10 bg-white/[0.04] xl:hidden" />
      <div className="hidden min-h-0 animate-pulse border-r border-white/10 bg-white/[0.03] xl:block" />
      <div className="lesson-main min-h-0 flex-1 overflow-y-scroll px-4 py-6 sm:px-6 md:px-8">
        <LessonArticleSkeleton />
      </div>
    </div>
  );
}

function LessonArticleSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[920px] space-y-6" aria-hidden>
      <div className="h-4 w-48 animate-pulse rounded bg-white/[0.05]" />
      <div className="h-10 w-full max-w-xl animate-pulse rounded bg-white/[0.06]" />
      <div className="flex gap-2">
        <div className="h-7 w-24 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="h-7 w-32 animate-pulse rounded-full bg-white/[0.04]" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="h-20 animate-pulse rounded bg-white/[0.03]" />
      <div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />
    </div>
  );
}
