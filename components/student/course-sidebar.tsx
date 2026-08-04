import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CourseCategoria, CourseModule } from "@/lib/course";

export function CourseSidebar({
  categorias,
  currentLessonId,
  className,
  showHeading = true
}: {
  categorias: CourseCategoria[];
  currentLessonId: string;
  className?: string;
  showHeading?: boolean;
}) {
  const modules = categorias.flatMap((categoria) => categoria.modules);
  const currentModule: CourseModule | undefined = modules.find((module) =>
    module.lessons.some((lesson) => lesson.id === currentLessonId)
  );

  if (!currentModule) {
    return (
      <aside className={cn("min-h-0 overflow-y-auto rounded-lg border border-white/10 bg-[#151019]", className)}>
        <div className="p-4">
          <Link href="/dashboard" className="text-sm font-semibold text-[#b07af5] hover:text-white">
            Voltar aos módulos
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#151019]",
        className
      )}
    >
      <div className="shrink-0 space-y-3 border-b border-white/[0.06] bg-[#121018]/95 px-4 py-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b07af5] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE]/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos módulos
        </Link>
        {showHeading ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#b07af5]">
              Módulo {currentModule.number}
            </p>
            {currentModule.title ? (
              <h2 className="mt-1 break-words text-sm font-semibold text-white/90">{currentModule.title}</h2>
            ) : null}
            <p className="mt-1 text-xs text-white/40">
              {currentModule.lessonCount} {currentModule.lessonCount === 1 ? "aula" : "aulas"}
              {" · "}
              {currentModule.completedCount} concluída{currentModule.completedCount === 1 ? "" : "s"}
            </p>
            <Progress value={currentModule.percent} className="mt-3 h-1" />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-2 pb-4">
        {currentModule.lessons.map((lesson) => {
          const active = lesson.id === currentLessonId;
          const Icon = lesson.completed ? CheckCircle2 : Circle;
          return (
            <Link
              key={lesson.id}
              href={`/curso/${lesson.id}`}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE]/50",
                active
                  ? "bg-[#8A1DEE]/18 text-white ring-1 ring-inset ring-[#8A1DEE]/35"
                  : "text-white/70 hover:bg-white/[0.04] hover:text-white/90"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  lesson.completed && "text-[#8A1DEE]",
                  active && "text-[#c4a0f7]"
                )}
              />
              <span className="min-w-0 break-words leading-snug">
                <span className="text-white/40">Aula {lesson.number}</span>
                <span className="mt-0.5 block line-clamp-2">{lesson.title}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
