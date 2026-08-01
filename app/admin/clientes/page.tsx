import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { ClientActions, type ClientRow } from "@/components/admin/client-management";
import { Card, CardContent } from "@/components/ui/card";
import { ACCESS_STATUS_LABELS, COMMERCIAL_STAGE_LABELS, formatBRLFromCents } from "@/lib/admin-labels";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const profile = await requireAdmin();
  return (
    <AdminShell userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Clientes</p>
          <h1 className="mt-2 text-4xl font-bold">Clientes ativos</h1>
          <p className="mt-3 text-white/62">Gerencie valor pago, status de acesso e etapa comercial sem apagar historico.</p>
        </header>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />}>
          <ClientsContent />
        </Suspense>
      </div>
    </AdminShell>
  );
}

async function ClientsContent() {
  const [counts, clients] = await Promise.all([
    Promise.all([
      prisma.userProfile.count({ where: { role: "STUDENT", status: "PENDING" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: "PAUSED" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: { in: ["CANCELLED", "REFUSED"] } } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: "BLOCKED" } })
    ]),
    prisma.userProfile.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        commercialStage: true,
        paidAmountCents: true,
        createdAt: true,
        approvedAt: true,
        adminNotes: true,
        blockReason: true
      }
    })
  ]);

  const summary = [
    { label: "Aguardando aprovacao", value: counts[0] },
    { label: "Ativos", value: counts[1] },
    { label: "Pausados", value: counts[2] },
    { label: "Cancelados", value: counts[3] },
    { label: "Bloqueados", value: counts[4] }
  ];

  const rows: ClientRow[] = clients.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    status: s.status,
    commercialStage: s.commercialStage,
    paidAmountCents: s.paidAmountCents,
    createdAt: s.createdAt.toISOString(),
    approvedAt: s.approvedAt?.toISOString() || null,
    adminNotes: s.adminNotes,
    blockReason: s.blockReason
  }));

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <strong className="text-2xl">{item.value}</strong>
              <p className="mt-1 text-sm text-white/55">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Valor pago</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client) => (
              <tr key={client.id} className="border-t border-white/10">
                <td className="px-4 py-3 font-semibold">{client.name}</td>
                <td className="px-4 py-3 break-all text-white/65">{client.email}</td>
                <td className="px-4 py-3">{formatBRLFromCents(client.paidAmountCents)}</td>
                <td className="px-4 py-3">{ACCESS_STATUS_LABELS[client.status]}</td>
                <td className="px-4 py-3">{COMMERCIAL_STAGE_LABELS[client.commercialStage]}</td>
                <td className="px-4 py-3">{new Date(client.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold">Acoes por cliente</h2>
        {rows.map((client) => (
          <ClientActions key={client.id} client={client} mode="clients" />
        ))}
        {!rows.length ? <Card><CardContent className="p-6 text-white/65">Nenhum cliente cadastrado.</CardContent></Card> : null}
      </div>
    </>
  );
}
