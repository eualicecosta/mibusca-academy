import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { TeamInviteForm, TeamMemberRow } from "@/components/admin/team-management";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const profile = await requireAdmin();
  return (
    <AdminShell userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Time</p>
          <h1 className="mt-2 text-4xl font-bold">Membros do time</h1>
          <p className="mt-3 text-white/62">Convide administradores e vendedores. A funcao e definida pelo convite, nao pelo usuario.</p>
        </header>
        <TeamInviteForm />
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />}>
          <TeamContent />
        </Suspense>
      </div>
    </AdminShell>
  );
}

async function TeamContent() {
  const [admins, sellers, pendingInvites, blocked, members, invites] = await Promise.all([
    prisma.userProfile.count({ where: { role: "ADMIN", status: "ACTIVE" } }),
    prisma.userProfile.count({ where: { role: "SELLER", status: "ACTIVE" } }),
    prisma.teamInvite.count({ where: { status: "PENDING" } }),
    prisma.userProfile.count({ where: { role: { in: ["ADMIN", "SELLER"] }, status: { in: ["BLOCKED", "PAUSED"] } } }),
    prisma.userProfile.findMany({
      where: { role: { in: ["ADMIN", "SELLER"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    }),
    prisma.teamInvite.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, email: true, role: true, createdAt: true, status: true }
    })
  ]);

  const summary = [
    { label: "Admins ativos", value: admins },
    { label: "Vendedores ativos", value: sellers },
    { label: "Convites pendentes", value: pendingInvites },
    { label: "Bloqueados/inativos", value: blocked }
  ];

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <strong className="text-2xl">{item.value}</strong>
              <p className="mt-1 text-sm text-white/55">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/50">Membros</div>
        {members.map((member) => (
          <TeamMemberRow
            key={member.id}
            member={{
              id: member.id,
              name: member.name,
              email: member.email,
              role: member.role,
              status: member.status,
              createdAt: member.createdAt.toISOString()
            }}
          />
        ))}
        {!members.length ? <CardContent className="p-6 text-white/65">Nenhum membro do time ainda.</CardContent> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/50">Convites pendentes</div>
        {invites.map((invite) => (
          <div key={invite.id} className="grid gap-2 border-b border-white/10 px-4 py-3 text-sm last:border-b-0 md:grid-cols-3">
            <p className="break-all font-semibold">{invite.email}</p>
            <p>{invite.role === "ADMIN" ? "Administrador" : "Vendedor"}</p>
            <p className="text-white/50">{new Date(invite.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        ))}
        {!invites.length ? <CardContent className="p-6 text-white/65">Nenhum convite pendente.</CardContent> : null}
      </Card>
    </>
  );
}
