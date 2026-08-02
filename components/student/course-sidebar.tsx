import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CourseCategoria } from "@/lib/course";

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
  const currentModule = modules.find((module) => module.lessons.some((lesson) => lesson.id === currentLessonId));

  return (
    <aside
      className={cn(
        "max-h-[calc(100vh-112px)] overflow-y-auto rounded-lg border border-white/10 bg-[#151019] scrollbar-thin",
        className
      )}
    >
      {showHeading ? (
        <div className="sticky top-0 z-[1] border-b border-white/[0.06] bg-[#121018]/95 px-4 py-4 backdrop-blur-sm">
          <p className="text-sm font-semibold text-white">Módulos e aulas</p>
          <p className="mt-0.5 text-xs text-white/40">Navegue pelo conteúdo do curso</p>
        </div>
      ) : null}
      <div className="space-y-0.5 pb-4">
        {categorias.map((categoria) => {
          const defaultValue =
            currentModule && currentModule.categoriaId === categoria.id
              ? [currentModule.id]
              : categoria.modules.slice(0, 1).map((module) => module.id);

          return (
            <section key={categoria.id} className="border-b border-white/[0.06] last:border-b-0">
              <div className="px-4 pb-2 pt-4">
                <h2 className="break-words text-[11px] font-bold uppercase tracking-[0.08em] text-[#b07af5]">
                  {categoria.title}
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  {categoria.modules.length} {categoria.modules.length === 1 ? "módulo" : "módulos"}
                </p>
              </div>
              <Accordion type="multiple" defaultValue={defaultValue}>
                {categoria.modules.map((module) => (
                  <AccordionItem key={module.id} value={module.id} className="border-white/[0.04]">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <span className="text-left">
                        <span className="block text-sm font-medium text-white/90">Módulo {module.number}</span>
                        <span className="mt-0.5 block text-xs font-normal text-white/45">
                          {module.completedCount}/{module.lessonCount} aulas
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <Progress value={module.percent} className="mb-3 h-1" />
                      <div className="space-y-0.5">
                        {module.lessons.map((lesson) => {
                          const active = lesson.id === currentLessonId;
                          const Icon = lesson.locked ? Lock : lesson.completed ? CheckCircle2 : Circle;
                          const body = (
                            <span
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                                active
                                  ? "bg-[#8A1DEE]/18 text-white ring-1 ring-inset ring-[#8A1DEE]/35"
                                  : "text-white/70 hover:bg-white/[0.04] hover:text-white/90",
                                lesson.locked && "cursor-not-allowed text-white/30 hover:bg-transparent hover:text-white/30"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  lesson.completed && !lesson.locked && "text-[#8A1DEE]",
                                  active && "text-[#c4a0f7]"
                                )}
                              />
                              <span className="min-w-0 break-words leading-snug">
                                <span className="text-white/40">Aula {lesson.number}</span>
                                <span className="mt-0.5 block line-clamp-2">{lesson.title}</span>
                              </span>
                            </span>
                          );

                          return lesson.locked ? (
                            <div key={lesson.id} aria-disabled>
                              {body}
                            </div>
                          ) : (
                            <Link key={lesson.id} href={`/curso/${lesson.id}`} prefetch={false} aria-current={active ? "page" : undefined}>
                              {body}
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
