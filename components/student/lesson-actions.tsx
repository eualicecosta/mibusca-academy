"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeLesson } from "@/lib/actions";

export function LessonActions({
  lessonId,
  previousId,
  nextId,
  completed
}: {
  lessonId: string;
  previousId?: string;
  nextId?: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [isComplete, setIsComplete] = useState(completed);

  return (
    <div className="sticky bottom-0 z-20 mt-8 min-w-0 rounded-lg border border-white/10 bg-[#0f0b14]/95 p-3 backdrop-blur">
      <div className="grid min-w-0 gap-3 md:grid-cols-3">
        {previousId ? (
          <Link
            href={`/curso/${previousId}`}
            className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-[#8A1DEE]/60 px-4 py-2 text-center text-sm font-semibold text-[#F5F3F3] hover:bg-[#8A1DEE]/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Aula anterior
          </Link>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            <ArrowLeft className="h-4 w-4" />
            Aula anterior
          </Button>
        )}
        <Button
          variant={isComplete ? "secondary" : "outline"}
          className="w-full border-emerald-500/70 text-emerald-300 hover:bg-emerald-500/10"
          disabled={pending || isComplete}
          onClick={() => {
            setIsComplete(true);
            startTransition(() => {
              void completeLesson(lessonId).catch(() => {
                setIsComplete(false);
              });
            });
          }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
          {isComplete ? "Aula concluida" : "Marcar como concluida"}
        </Button>
        {nextId ? (
          <Link
            href={`/curso/${nextId}`}
            className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#53009F] to-[#8A1DEE] px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Proxima aula
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Button disabled>
            Proxima aula
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
