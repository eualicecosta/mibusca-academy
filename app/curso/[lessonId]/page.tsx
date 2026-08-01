import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, ImageIcon, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CourseSidebar } from "@/components/student/course-sidebar";
import { LessonChecklist } from "@/components/student/checklist";
import { LessonActions } from "@/components/student/lesson-actions";
import { MobileCourseNav } from "@/components/student/mobile-course-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { resolveAssetUrl } from "@/lib/assets";
import { requireApprovedStudent } from "@/lib/auth";
import { getLessonContentForStudent, getStudentCourse } from "@/lib/course";

export const dynamic = "force-dynamic";

type StudentCourse = Awaited<ReturnType<typeof getStudentCourse>>;
type FlatLesson = StudentCourse["flatLessons"][number];

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const profile = await requireApprovedStudent();

  return (
    <AppShell
      showAdmin={profile.role === "ADMIN"}
      userName={profile.name}
      userEmail={profile.email}
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden xl:block">
      <div className="z-30 shrink-0 border-b border-white/10 bg-[#09070d]/95 p-4 backdrop-blur xl:hidden">
        <MobileCourseNav>
          <CourseSidebar categorias={data.categorias} currentLessonId={lessonId} className="max-h-[calc(100dvh-5rem)]" />
        </MobileCourseNav>
      </div>
      <CourseSidebar
        categorias={data.categorias}
        currentLessonId={lessonId}
        showHeading={false}
        className="hidden xl:fixed xl:bottom-0 xl:left-[72px] xl:top-[72px] xl:z-10 xl:block xl:w-[440px] xl:max-h-none xl:rounded-none xl:border-y-0 xl:border-l-0 xl:border-r xl:border-white/10 xl:bg-[#151019]"
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin xl:ml-[440px] xl:h-full xl:px-8 xl:py-8">
        <Suspense fallback={<LessonArticleSkeleton />}>
          <LessonArticle
            userId={userId}
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
  userId,
  current,
  previous,
  next,
  totalLessons,
  completedLessons,
  modulePercent
}: {
  userId: string;
  current: FlatLesson;
  previous: FlatLesson | null;
  next: FlatLesson | null;
  totalLessons: number;
  completedLessons: number;
  modulePercent: number;
}) {
  const { lesson: detail, checked } = await getLessonContentForStudent(userId, current.id);

  if (!detail) {
    notFound();
  }

  return (
    <article className="mx-auto min-w-0 max-w-6xl overflow-visible rounded-lg border border-white/10 bg-[#151019] shadow-2xl">
      <header className="rounded-t-lg border-b border-white/10 bg-[#151019] p-3 sm:p-5">
        <div className="mb-3 grid min-w-0 grid-cols-3 gap-2 sm:mb-4 sm:gap-4">
          <Card className="bg-white/[0.03]">
            <CardContent className="min-w-0 p-3 sm:p-4">
              <p className="truncate text-[11px] text-white/55 sm:text-xs">Aulas</p>
              <strong className="text-xl sm:text-2xl">{totalLessons}</strong>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03]">
            <CardContent className="min-w-0 p-3 sm:p-4">
              <p className="truncate text-[11px] text-white/55 sm:text-xs">Concluidas</p>
              <strong className="text-xl sm:text-2xl">{completedLessons}</strong>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03]">
            <CardContent className="min-w-0 p-3 sm:p-4">
              <p className="truncate text-[11px] text-white/55 sm:text-xs">Modulo atual</p>
              <strong className="text-xl sm:text-2xl">{modulePercent}%</strong>
            </CardContent>
          </Card>
        </div>
        <Progress value={modulePercent} />
      </header>

      <div className="min-w-0 space-y-5 p-4 sm:p-5">
        <header className="border-b border-white/10 pb-5">
          <p className="text-sm font-bold text-[#8A1DEE]">
          {current.categoriaTitle} - Modulo {current.moduleNumber} - Aula {current.number}
          </p>
          <h1 className="mt-2 break-words text-3xl font-bold md:text-5xl">{detail.title}</h1>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Objetivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words leading-7 text-white/70">{detail.objective}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contexto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words leading-7 text-white/70">{detail.context}</p>
          </CardContent>
        </Card>
        </section>

        <Card>
        <CardHeader>
          <CardTitle>Passo a passo</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-5">
            {detail.blocks.map((block) => {
              const url = resolveAssetUrl(block.imagePath);
              return (
                <li key={block.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8A1DEE] text-sm font-bold">
                      {block.order}
                    </span>
                    <p className="min-w-0 break-words leading-7 text-white/78">{block.content}</p>
                  </div>
                  {url ? (
                    <figure className="mt-4 overflow-hidden rounded-lg border border-white/10">
                      <Image
                        src={url}
                        alt={block.imageCaption || block.content}
                        width={1280}
                        height={720}
                        sizes="(min-width: 1280px) calc(100vw - 520px), 100vw"
                        className="max-h-[560px] w-full bg-black/30 object-contain"
                      />
                      {block.imageCaption ? <figcaption className="break-words p-3 text-sm text-white/55">{block.imageCaption}</figcaption> : null}
                    </figure>
                  ) : block.imagePath ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-white/15 p-3 text-sm text-white/55">
                      <ImageIcon className="h-4 w-4" />
                      <span className="min-w-0 break-all">Imagem esperada: {block.imagePath}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </CardContent>
        </Card>

        {detail.tipText ? (
        <Card className={detail.tipKind === "Atencao" ? "border-amber-400/30" : "border-[#8A1DEE]/35"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {detail.tipKind === "Atencao" ? <AlertTriangle className="h-5 w-5 text-amber-300" /> : <Lightbulb className="h-5 w-5 text-[#8A1DEE]" />}
              {detail.tipKind || "Dica"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words leading-7 text-white/72">{detail.tipText}</p>
          </CardContent>
        </Card>
        ) : null}

        {detail.checklistItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Checklist de conclusao</CardTitle>
          </CardHeader>
          <CardContent>
            <LessonChecklist items={detail.checklistItems} checkedIds={checked.map((item) => item.checklistItemId)} />
          </CardContent>
        </Card>
        ) : null}

        <LessonActions
          lessonId={current.id}
          previousId={previous?.locked ? undefined : previous?.id}
          nextId={next?.locked ? undefined : next?.id}
          completed={current.completed}
        />
      </div>
    </article>
  );
}

function LessonShellSkeleton() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden xl:block">
      <div className="h-20 shrink-0 animate-pulse border-b border-white/10 bg-white/[0.04] xl:hidden" />
      <div className="hidden animate-pulse border-r border-white/10 bg-white/[0.04] xl:fixed xl:bottom-0 xl:left-[72px] xl:top-[72px] xl:block xl:w-[440px]" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 xl:ml-[440px] xl:h-full xl:px-8 xl:py-8">
        <LessonArticleSkeleton />
      </div>
    </div>
  );
}

function LessonArticleSkeleton() {
  return (
    <article className="mx-auto min-w-0 max-w-6xl rounded-lg border border-white/10 bg-[#151019]">
      <div className="border-b border-white/10 bg-[#151019] p-3 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
          <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
          <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <div className="h-32 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
          <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-white/[0.04]" />
      </div>
    </article>
  );
}
