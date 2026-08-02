import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Plus, Save } from "lucide-react";
import { LessonBlockBuilder } from "@/components/admin/lesson-block-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLesson } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-white/65">
      {label}
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-11 min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]"
    />
  );
}

export default async function AdminModuleContentPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      number: true,
      title: true,
      objective: true,
      status: true,
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          order: true,
          status: true,
          progress: { where: { completed: true }, select: { id: true } }
        }
      }
    }
  });

  if (!courseModule) {
    notFound();
  }

  const completedCount = courseModule.lessons.reduce((sum, lesson) => sum + lesson.progress.length, 0);

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-8">
      <header className="space-y-4">
        <Link href="/admin/conteudo" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Voltar para curso
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Curso</p>
            <h1 className="mt-2 break-words text-4xl font-bold">{courseModule.title || `Módulo ${courseModule.number}`}</h1>
            {courseModule.objective ? <p className="mt-3 max-w-3xl break-words text-white/62">{courseModule.objective}</p> : null}
          </div>
        </div>
      </header>

      <section className="grid min-w-0 gap-5 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <BookOpen className="h-5 w-5 text-[#8A1DEE]" />
            <div>
              <p className="text-sm text-white/55">Aulas</p>
              <strong className="text-3xl">{courseModule.lessons.length}</strong>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-5 w-5 text-[#8A1DEE]" />
            <div>
              <p className="text-sm text-white/55">Conclusões</p>
              <strong className="text-3xl">{completedCount}</strong>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-white/55">Status do módulo</p>
            <strong className="text-2xl">{courseModule.status}</strong>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Nova aula</CardTitle>
            <p className="mt-1 text-sm text-white/55">Crie a aula e depois monte o conteúdo em blocos.</p>
          </div>
          <Plus className="h-5 w-5 text-[#8A1DEE]" />
        </CardHeader>
        <CardContent>
          <form action={createLesson} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <input type="hidden" name="moduleId" value={courseModule.id} />
            <Field label="Título">
              <TextInput name="title" required placeholder="Nome da aula" />
            </Field>
            <Button type="submit" className="w-full sm:w-fit">
              <Save className="h-4 w-4" />
              Criar aula
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Construtor de conteúdo</h2>
          <p className="mt-1 text-sm text-white/55">
            Selecione uma aula, adicione blocos, reordene por arraste e visualize como o aluno.
          </p>
        </div>

        <LessonBlockBuilder
          moduleId={courseModule.id}
          lessons={courseModule.lessons.map((lesson) => ({
            id: lesson.id,
            number: lesson.number,
            title: lesson.title,
            order: lesson.order,
            status: lesson.status,
            completedCount: lesson.progress.length
          }))}
        />
      </section>
    </div>
  );
}
