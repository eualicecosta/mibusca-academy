import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Painel administrativo</p>
        <h1 className="mt-2 break-words text-4xl font-bold">Visao geral</h1>
        <p className="mt-3 text-white/62">Resumo de leads, clientes e time. Use a sidebar para navegar.</p>
      </header>
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>}>
        <AdminMetrics />
      </Suspense>
    </div>
  );
}

async function AdminMetrics() {
  const [
    newLeads,
    awaitingPayment,
    awaitingApproval,
    activeClients,
    pausedClients,
    cancelledClients,
    sellers,
    admins
  ] = await Promise.all([
    prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "NEW_LEAD" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "AWAITING_PAYMENT" } }),
    prisma.userProfile.count({
      where: {
        role: "STUDENT",
        OR: [{ status: "PENDING" }, { commercialStage: "AWAITING_APPROVAL" }]
      }
    }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: "PAUSED" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: { in: ["CANCELLED", "REFUSED"] } } }),
    prisma.userProfile.count({ where: { role: "SELLER" } }),
    prisma.userProfile.count({ where: { role: "ADMIN" } })
  ]);

  const cards = [
    { label: "Novos leads", value: newLeads },
    { label: "Aguardando pagamento", value: awaitingPayment },
    { label: "Aguardando aprovacao", value: awaitingApproval },
    { label: "Clientes ativos", value: activeClients },
    { label: "Clientes pausados", value: pausedClients },
    { label: "Cancelados", value: cancelledClients },
    { label: "Vendedores", value: sellers },
    { label: "Administradores", value: admins }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-5">
            <strong className="text-3xl">{card.value}</strong>
            <p className="mt-2 text-sm text-white/58">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
