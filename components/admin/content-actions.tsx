"use client";

import { useTransition } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLesson, deleteModule, updateLessonStatus, updateModuleStatus } from "@/lib/actions";

export function ModuleActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          startTransition(() => {
            void updateModuleStatus(id, status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED");
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {status === "PUBLISHED" ? "Ocultar" : "Publicar"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Excluir este módulo e todas as aulas/progressos associados?")) {
            startTransition(() => {
              void deleteModule(id);
            });
          }
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Excluir
      </Button>
    </div>
  );
}

export function LessonActionsAdmin({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          startTransition(() => {
            void updateLessonStatus(id, status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED");
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {status === "PUBLISHED" ? "Ocultar" : "Publicar"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Excluir esta aula e os progressos associados?")) {
            startTransition(() => {
              void deleteLesson(id);
            });
          }
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Excluir
      </Button>
    </div>
  );
}
