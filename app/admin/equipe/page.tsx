import { Suspense } from "react";
import { TeamMemberRow } from "@/components/admin/team-management";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Time</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Membros do time</h1>
        <p className="mt-3 text-white/62">
          Gerencie administradores e vendedores já aprovados. Novos membros se cadastram normalmente e recebem a função
          na tela de Aprovações pendentes.
        </p>
      </header>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />}>
        <TeamContent />
      </Suspense>
    </div>
  );
}

async function TeamContent() {
  const [admins, sellers, blocked, members, clients] = await Promise.all([
    prisma.userProfile.count({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null } }),
    prisma.userProfile.count({ where: { role: "SELLER", status: "ACTIVE", deletedAt: null } }),
    prisma.userProfile.count({
      where: { role: { in: ["ADMIN", "SELLER"] }, status: { in: ["BLOCKED", "PAUSED"] }, deletedAt: null }
    }),
    prisma.userProfile.findMany({
      where: { role: { in: ["ADMIN", "SELLER"] }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    }),
    prisma.userProfile.findMany({
      where: { role: "STUDENT", deletedAt: null },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, email: true }
    })
  ]);

  const summary = [
    { label: "Administradores ativos", value: admins },
    { label: "Vendedores ativos", value: sellers },
    { label: "Bloqueados/inativos", value: blocked },
    { label: "Total no time", value: members.length }
  ];

  const clientPicks = clients.map((c) => ({ id: c.id, name: c.name, email: c.email }));

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
            clients={clientPicks}
          />
        ))}
        {!members.length ? (
          <CardContent className="p-6 text-white/65">
            Nenhum administrador ou vendedor aprovado ainda. Cadastros novos aparecem em Aprovações pendentes.
          </CardContent>
        ) : null}
      </Card>
    </>
  );
}
