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
import { requireApprovedStudent } from "@/lib/auth";
import { getLessonContentForStudent, getStudentCourse } from "@/lib/course";

export const dynamic = "force-dynamic";

type StudentCourse = Awaited<ReturnType<typeof getStudentCourse>>;
type FlatLesson = StudentCourse["flatLessons"][number];

function imageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-images";
  return base ? `${base}/storage/v1/object/public/${bucket}/${path}` : null;
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const profile = await requireApprovedStudent();

  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
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
    <div className="min-w-0">
      <div className="xl:hidden">
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
      <div className="min-w-0 pt-6 xl:ml-[496px] xl:pt-2">
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
    <article className="min-w-0 space-y-5 rounded-lg border border-white/10 bg-[#151019] p-4 shadow-2xl sm:p-5">
      <header className="border-b border-white/10 pb-5">
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <Card className="bg-white/[0.03]">
            <CardContent className="p-4">
              <p className="text-xs text-white/55">Aulas</p>
              <strong className="text-2xl">{totalLessons}</strong>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03]">
            <CardContent className="p-4">
              <p className="text-xs text-white/55">Concluidas</p>
              <strong className="text-2xl">{completedLessons}</strong>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03]">
            <CardContent className="p-4">
              <p className="text-xs text-white/55">Modulo atual</p>
              <strong className="text-2xl">{modulePercent}%</strong>
            </CardContent>
          </Card>
        </div>
        <Progress value={modulePercent} />
        <p className="mt-6 text-sm font-bold text-[#8A1DEE]">
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
              const url = imageUrl(block.imagePath);
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
    </article>
  );
}

function LessonShellSkeleton() {
  return (
    <div className="min-w-0">
      <div className="h-12 animate-pulse rounded-lg border border-white/10 bg-white/[0.04] xl:hidden" />
      <div className="hidden animate-pulse border-r border-white/10 bg-white/[0.04] xl:fixed xl:bottom-0 xl:left-[72px] xl:top-[72px] xl:block xl:w-[440px]" />
      <div className="pt-6 xl:ml-[496px] xl:pt-2">
        <LessonArticleSkeleton />
      </div>
    </div>
  );
}

function LessonArticleSkeleton() {
  return (
    <article className="min-w-0 space-y-5 rounded-lg border border-white/10 bg-[#151019] p-4 sm:p-5">
      <div className="h-40 animate-pulse rounded-lg bg-white/[0.04]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-white/[0.04]" />
    </article>
  );
}
