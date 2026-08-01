import { Suspense } from "react";
import { MemberOptions } from "@/components/admin/member-options";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export default async function MembersPage() {
  const authStartedAt = isDev ? performance.now() : 0;
  const profile = await requireAdmin();
  if (isDev) {
    console.info(`[perf] admin.membros.requireAdmin ${Math.round(performance.now() - authStartedAt)}ms`);
  }

  return (
    <AppShell showAdmin={profile.role === "ADMIN"} userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto min-w-0 max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Membros</p>
          <h1 className="mt-2 break-words text-4xl font-bold">Membros ativos</h1>
          <p className="mt-3 break-words text-white/62">
            Alunos aprovados aparecem aqui. Clique em um membro para abrir as opcoes.
          </p>
        </header>

        <Suspense fallback={<MembersListSkeleton />}>
          <MembersList />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function MembersList() {
  const startedAt = isDev ? performance.now() : 0;
  const members = await prisma.userProfile.findMany({
    where: { role: "STUDENT", status: "ACTIVE" },
    orderBy: { approvedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      whatsapp: true,
      clerkId: true
    }
  });
  if (isDev) {
    console.info(`[perf] admin.membros.query ${Math.round(performance.now() - startedAt)}ms count=${members.length}`);
  }

  return (
    <Card className="overflow-hidden">
      <div className="hidden border-b border-white/10 bg-white/[0.04] px-5 py-4 text-xs font-bold uppercase tracking-wide text-white/48 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_180px_120px_24px] md:gap-4">
        <span>Membro</span>
        <span>E-mail</span>
        <span>WhatsApp</span>
        <span>Status</span>
        <span />
      </div>

      {members.map((member) => (
        <MemberOptions key={member.id} member={member} />
      ))}

      {!members.length ? (
        <CardContent className="p-6">
          <p className="text-white/65">Nenhum membro ativo no momento.</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function MembersListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10" aria-busy="true" aria-label="Carregando membros">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse border-b border-white/10 bg-white/[0.03] last:border-b-0" />
      ))}
    </div>
  );
}
