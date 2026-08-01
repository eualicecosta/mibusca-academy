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
    <aside className={cn("max-h-[calc(100vh-112px)] overflow-y-auto rounded-lg border border-white/10 bg-[#151019] scrollbar-thin", className)}>
      {showHeading ? (
        <div className="border-b border-white/10 p-5">
          <p className="text-sm font-bold text-white">Modulos e aulas</p>
        </div>
      ) : null}
      <div className="space-y-1">
        {categorias.map((categoria) => {
          const defaultValue = currentModule && currentModule.categoriaId === categoria.id
            ? [currentModule.id]
            : categoria.modules.slice(0, 1).map((module) => module.id);

          return (
            <section key={categoria.id} className="border-b border-white/10">
              <div className="px-5 py-4">
                <h2 className="break-words text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">{categoria.title}</h2>
                <p className="mt-1 text-xs text-white/45">{categoria.modules.length} modulos</p>
              </div>
              <Accordion type="multiple" defaultValue={defaultValue}>
                {categoria.modules.map((module) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger>
                      <span>
                        Modulo {module.number}
                        <span className="mt-1 block text-xs font-medium text-white/55">
                          {module.completedCount}/{module.lessonCount} aulas
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3">
                      <Progress value={module.percent} className="mb-3" />
                      <div className="space-y-2">
                        {module.lessons.map((lesson) => {
                          const active = lesson.id === currentLessonId;
                          const Icon = lesson.locked ? Lock : lesson.completed ? CheckCircle2 : Circle;
                          const body = (
                            <span
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/78",
                                active && "bg-[#8A1DEE]/20 text-white",
                                lesson.locked && "text-white/35"
                              )}
                            >
                              <Icon className={cn("h-4 w-4 shrink-0", lesson.completed && "text-[#8A1DEE]")} />
                              <span className="min-w-0 break-words line-clamp-2">Aula {lesson.number} - {lesson.title}</span>
                            </span>
                          );

                          return lesson.locked ? (
                            <div key={lesson.id}>{body}</div>
                          ) : (
                            <Link key={lesson.id} href={`/curso/${lesson.id}`} prefetch={false}>
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
