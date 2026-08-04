"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeLesson } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function LessonActions({
  lessonId,
  previousId,
  previousTitle,
  nextId,
  nextTitle,
  completed,
  modulesHref = "/dashboard"
}: {
  lessonId: string;
  previousId?: string;
  previousTitle?: string;
  nextId?: string;
  nextTitle?: string;
  completed: boolean;
  /** Shown when there is no next lesson in the current module. */
  modulesHref?: string;
}) {
  const [pending, setPending] = useState(false);
  const [isComplete, setIsComplete] = useState(completed);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <Button
        variant={isComplete ? "secondary" : "default"}
        className={cn(
          "h-12 w-full text-base font-semibold sm:w-auto sm:min-w-[240px]",
          !isComplete && "bg-gradient-to-r from-[#53009F] to-[#8A1DEE] text-white hover:opacity-95"
        )}
        disabled={pending || isComplete}
        onClick={() => {
          setIsComplete(true);
          setPending(true);
          startTransition(() => {
            void completeLesson(lessonId)
              .catch(() => {
                setIsComplete(false);
              })
              .finally(() => {
                setPending(false);
              });
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
        {isComplete ? "Aula concluída" : "Marcar como concluída"}
      </Button>

      <nav
        aria-label="Navegação entre aulas"
        className="grid min-w-0 gap-3 sm:grid-cols-2"
      >
        {previousId ? (
          <Link
            href={`/curso/${previousId}`}
            className="group flex min-h-14 min-w-0 flex-col justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-[#8A1DEE]/40 hover:bg-[#8A1DEE]/10"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/45">
              <ArrowLeft className="h-3.5 w-3.5" />
              Aula anterior
            </span>
            {previousTitle ? (
              <span className="line-clamp-2 break-words text-sm font-semibold text-white/85 group-hover:text-white">
                {previousTitle}
              </span>
            ) : null}
          </Link>
        ) : (
          <div className="flex min-h-14 min-w-0 flex-col justify-center gap-0.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 opacity-45">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
              <ArrowLeft className="h-3.5 w-3.5" />
              Aula anterior
            </span>
            <span className="text-sm text-white/35">Início do módulo</span>
          </div>
        )}

        {nextId ? (
          <Link
            href={`/curso/${nextId}`}
            prefetch
            className="group flex min-h-14 min-w-0 flex-col justify-center gap-0.5 rounded-xl border border-[#8A1DEE]/35 bg-gradient-to-r from-[#53009F]/25 to-[#8A1DEE]/20 px-4 py-3 transition hover:border-[#8A1DEE]/60 hover:from-[#53009F]/35 hover:to-[#8A1DEE]/30 sm:text-right"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#c4a0f7] sm:justify-end">
              Próxima aula
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            {nextTitle ? (
              <span className="line-clamp-2 break-words text-sm font-semibold text-white group-hover:text-white">
                {nextTitle}
              </span>
            ) : null}
          </Link>
        ) : (
          <Link
            href={modulesHref}
            className="group flex min-h-14 min-w-0 flex-col justify-center gap-0.5 rounded-xl border border-[#8A1DEE]/35 bg-gradient-to-r from-[#53009F]/25 to-[#8A1DEE]/20 px-4 py-3 transition hover:border-[#8A1DEE]/60 sm:text-right"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#c4a0f7] sm:justify-end">
              Voltar aos módulos
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-white/85">Fim deste módulo</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
