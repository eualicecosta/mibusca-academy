import { Suspense } from "react";
import { ClientRowActions, type ClientRow, type SellerOption } from "@/components/admin/client-management";
import { Card, CardContent } from "@/components/ui/card";
import { ACCESS_STATUS_LABELS, COMMERCIAL_STAGE_LABELS, formatBRLFromCents } from "@/lib/admin-labels";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const started = process.env.NODE_ENV === "development" ? performance.now() : 0;
  await requireAdmin();
  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] clientes.requireAdmin ${Math.round(performance.now() - started)}ms`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Clientes</p>
        <h1 className="mt-2 text-4xl font-bold">Clientes ativos</h1>
        <p className="mt-3 text-white/62">Gerencie valor pago, vendedor, status de acesso e etapa comercial sem apagar historico.</p>
      </header>
      <Suspense fallback={<ClientsSkeleton />}>
        <ClientsContent />
      </Suspense>
    </div>
  );
}

function ClientsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />
    </div>
  );
}

async function ClientsContent() {
  const started = process.env.NODE_ENV === "development" ? performance.now() : 0;

  const [counts, clients, sellers] = await Promise.all([
    Promise.all([
      prisma.userProfile.count({ where: { role: "STUDENT", status: "PENDING", deletedAt: null } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: "ACTIVE", deletedAt: null } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: "PAUSED", deletedAt: null } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: { in: ["CANCELLED", "REFUSED"] }, deletedAt: null } }),
      prisma.userProfile.count({ where: { role: "STUDENT", status: "BLOCKED", deletedAt: null } })
    ]),
    prisma.userProfile.findMany({
      where: { role: "STUDENT", deletedAt: null },
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
        updatedAt: true,
        approvedAt: true,
        adminNotes: true,
        blockReason: true,
        sellerId: true,
        seller: { select: { id: true, name: true } }
      }
    }),
    prisma.userProfile.findMany({
      where: { role: "SELLER", status: "ACTIVE", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] clientes.query ${Math.round(performance.now() - started)}ms`);
  }

  const summary = [
    { label: "Aguardando aprovacao", value: counts[0] },
    { label: "Ativos", value: counts[1] },
    { label: "Pausados", value: counts[2] },
    { label: "Cancelados", value: counts[3] },
    { label: "Bloqueados", value: counts[4] }
  ];

  const sellerOptions: SellerOption[] = sellers.map((s) => ({ id: s.id, name: s.name }));

  const rows: ClientRow[] = clients.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    status: s.status,
    commercialStage: s.commercialStage,
    paidAmountCents: s.paidAmountCents,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    approvedAt: s.approvedAt?.toISOString() || null,
    adminNotes: s.adminNotes,
    blockReason: s.blockReason,
    sellerId: s.sellerId,
    sellerName: s.seller?.name || null
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

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Vendedor responsavel</th>
              <th className="px-4 py-3">Valor pago</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Etapa comercial</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client) => (
              <tr key={client.id} className="border-t border-white/10">
                <td className="px-4 py-3 font-semibold">{client.name}</td>
                <td className="break-all px-4 py-3 text-white/65">{client.email}</td>
                <td className="px-4 py-3 text-white/75">{client.sellerName || "Sem vendedor"}</td>
                <td className="px-4 py-3">{formatBRLFromCents(client.paidAmountCents)}</td>
                <td className="px-4 py-3">{ACCESS_STATUS_LABELS[client.status]}</td>
                <td className="px-4 py-3">{COMMERCIAL_STAGE_LABELS[client.commercialStage]}</td>
                <td className="px-4 py-3">{new Date(client.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <ClientRowActions client={client} sellers={sellerOptions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <div className="p-6 text-sm text-white/65">Nenhum cliente cadastrado.</div>
        ) : null}
      </div>
    </>
  );
}
