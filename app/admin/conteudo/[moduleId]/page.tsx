import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Plus, Save } from "lucide-react";
import { LessonActionsAdmin } from "@/components/admin/content-actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLesson, updateLesson } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
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

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-[#8A1DEE]"
    />
  );
}

export default async function AdminModuleContentPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const profile = await requireAdmin();
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
          objective: true,
          context: true,
          tipKind: true,
          tipText: true,
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
    <AppShell showAdmin={profile.role === "ADMIN"} userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto min-w-0 max-w-6xl space-y-8">
        <header className="space-y-4">
          <Link href="/admin/conteudo" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Voltar para categorias
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Editor de conteudo</p>
              <h1 className="mt-2 break-words text-4xl font-bold">{courseModule.title || `Modulo ${courseModule.number}`}</h1>
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
                <p className="text-sm text-white/55">Conclusoes</p>
                <strong className="text-3xl">{completedCount}</strong>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-white/55">Status do modulo</p>
              <strong className="text-2xl">{courseModule.status}</strong>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Nova aula</CardTitle>
              <p className="mt-1 text-sm text-white/55">Cadastre uma nova aula dentro deste modulo.</p>
            </div>
            <Plus className="h-5 w-5 text-[#8A1DEE]" />
          </CardHeader>
          <CardContent>
            <form action={createLesson} className="grid gap-4">
              <input type="hidden" name="moduleId" value={courseModule.id} />
              <Field label="Titulo">
                <TextInput name="title" required />
              </Field>
              <Field label="Objetivo">
                <TextArea name="objective" rows={2} />
              </Field>
              <Field label="Contexto">
                <TextArea name="context" rows={3} />
              </Field>
              <Button type="submit" className="w-fit">
                <Save className="h-4 w-4" />
                Criar aula
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Aulas do modulo</h2>
            <p className="mt-1 text-sm text-white/55">Edite texto, ordem e visibilidade de cada aula.</p>
          </div>

          {courseModule.lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#8A1DEE]">
                    Aula {lesson.number} - {lesson.status}
                  </p>
                  <CardTitle className="mt-1">{lesson.title}</CardTitle>
                  <p className="mt-1 text-sm text-white/48">{lesson.progress.length} alunos concluiram</p>
                </div>
                <LessonActionsAdmin id={lesson.id} status={lesson.status} />
              </CardHeader>
              <CardContent>
                <form action={updateLesson} className="grid gap-3">
                  <input type="hidden" name="id" value={lesson.id} />
                  <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                    <Field label="Titulo">
                      <TextInput name="title" defaultValue={lesson.title} required />
                    </Field>
                    <Field label="Ordem">
                      <TextInput name="order" type="number" defaultValue={lesson.order} />
                    </Field>
                  </div>
                  <Field label="Objetivo">
                    <TextArea name="objective" defaultValue={lesson.objective || ""} rows={2} />
                  </Field>
                  <Field label="Contexto">
                    <TextArea name="context" defaultValue={lesson.context || ""} rows={2} />
                  </Field>
                  <div className="grid min-w-0 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                    <Field label="Tipo de bloco">
                      <TextInput name="tipKind" defaultValue={lesson.tipKind || ""} />
                    </Field>
                    <Field label="Dica/Atencao">
                      <TextInput name="tipText" defaultValue={lesson.tipText || ""} />
                    </Field>
                  </div>
                  <Button type="submit" size="sm" className="w-fit">
                    <Save className="h-4 w-4" />
                    Salvar aula
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
