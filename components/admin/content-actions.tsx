"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLesson, deleteModule, updateLessonStatus, updateModuleStatus } from "@/lib/actions";

export function ModuleActions({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => void updateModuleStatus(id, status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED")}>
        {status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {status === "PUBLISHED" ? "Ocultar" : "Publicar"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          if (window.confirm("Excluir este módulo e todas as aulas/progressos associados?")) {
            void deleteModule(id);
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </div>
  );
}

export function LessonActionsAdmin({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => void updateLessonStatus(id, status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED")}>
        {status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {status === "PUBLISHED" ? "Ocultar" : "Publicar"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          if (window.confirm("Excluir esta aula e os progressos associados?")) {
            void deleteLesson(id);
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </div>
  );
}
