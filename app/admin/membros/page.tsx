import { MemberOptions } from "@/components/admin/member-options";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const profile = await requireAdmin();
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

  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
      <div className="mx-auto min-w-0 max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Membros</p>
          <h1 className="mt-2 break-words text-4xl font-bold">Membros ativos</h1>
          <p className="mt-3 break-words text-white/62">
            Alunos aprovados aparecem aqui. Clique em um membro para abrir as opcoes.
          </p>
        </header>

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
      </div>
    </AppShell>
  );
}
