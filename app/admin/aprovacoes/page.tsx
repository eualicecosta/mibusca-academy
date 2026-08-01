import { Suspense } from "react";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { updateUserApproval } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export default async function ApprovalsPage() {
  const authStartedAt = isDev ? performance.now() : 0;
  const profile = await requireAdmin();
  if (isDev) {
    console.info(`[perf] admin.aprovacoes.requireAdmin ${Math.round(performance.now() - authStartedAt)}ms`);
  }

  return (
    <AppShell showAdmin={profile.role === "ADMIN"} userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto min-w-0 max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Aprovacoes</p>
          <h1 className="mt-2 break-words text-4xl font-bold">Cadastros pendentes</h1>
          <p className="mt-3 break-words text-white/62">
            Depois de aprovado, o aluno sai desta fila e passa para a tela de membros ativos.
          </p>
        </header>

        <Suspense fallback={<ApprovalsListSkeleton />}>
          <ApprovalsList />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function ApprovalsList() {
  const startedAt = isDev ? performance.now() : 0;
  const students = await prisma.userProfile.findMany({
    where: { role: "STUDENT", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      whatsapp: true,
      status: true,
      clerkId: true
    }
  });
  if (isDev) {
    console.info(`[perf] admin.aprovacoes.query ${Math.round(performance.now() - startedAt)}ms count=${students.length}`);
  }

  return (
    <div className="space-y-3">
      {students.map((student) => (
        <Card key={student.id}>
          <CardContent className="grid min-w-0 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <CardTitle>{student.name}</CardTitle>
              <p className="mt-1 break-words text-sm text-white/58">
                {student.email} {student.whatsapp ? `- ${student.whatsapp}` : ""} - {student.status}
              </p>
              <p className="mt-1 break-all text-xs text-white/38">Clerk ID: {student.clerkId}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <form action={async () => { "use server"; await updateUserApproval(student.id, "ACTIVE"); }}>
                <Button size="sm"><Check className="h-4 w-4" /> Aprovar</Button>
              </form>
              <form action={async () => { "use server"; await updateUserApproval(student.id, "REFUSED"); }}>
                <Button size="sm" variant="destructive"><X className="h-4 w-4" /> Recusar</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}

      {!students.length ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-white/65">Nenhum cadastro pendente no momento.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ApprovalsListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando pendentes">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
  );
}
