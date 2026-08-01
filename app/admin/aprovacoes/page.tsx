import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { ClientActions, type ClientRow } from "@/components/admin/client-management";
import { Card, CardContent } from "@/components/ui/card";
import { ACCESS_STATUS_LABELS, COMMERCIAL_STAGE_LABELS } from "@/lib/admin-labels";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const profile = await requireAdmin();
  return (
    <AdminShell userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Aprovacoes</p>
          <h1 className="mt-2 text-4xl font-bold">Aprovacoes pendentes</h1>
          <p className="mt-3 text-white/62">Gerencie o funil comercial e libere o acesso quando o pagamento for confirmado.</p>
        </header>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />}>
          <ApprovalsContent />
        </Suspense>
      </div>
    </AdminShell>
  );
}

async function ApprovalsContent() {
  const [stageCounts, students] = await Promise.all([
    Promise.all([
      prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "NEW_LEAD" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "CONTACT_MADE" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "AWAITING_PAYMENT" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "PAYMENT_CONFIRMED" } }),
      prisma.userProfile.count({ where: { role: "STUDENT", commercialStage: "AWAITING_REGISTRATION" } }),
      prisma.userProfile.count({
        where: {
          role: "STUDENT",
          OR: [{ status: "PENDING" }, { commercialStage: "AWAITING_APPROVAL" }]
        }
      })
    ]),
    prisma.userProfile.findMany({
      where: {
        role: "STUDENT",
        OR: [
          { status: "PENDING" },
          {
            commercialStage: {
              in: ["NEW_LEAD", "CONTACT_MADE", "AWAITING_PAYMENT", "PAYMENT_CONFIRMED", "AWAITING_REGISTRATION", "AWAITING_APPROVAL"]
            }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
    { label: "Novos leads", value: stageCounts[0] },
    { label: "Aguardando contato", value: stageCounts[1] },
    { label: "Aguardando pagamento", value: stageCounts[2] },
    { label: "Pagamento confirmado", value: stageCounts[3] },
    { label: "Aguardando cadastro", value: stageCounts[4] },
    { label: "Aguardando aprovacao", value: stageCounts[5] }
  ];

  const rows: ClientRow[] = students.map((s) => ({
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <strong className="text-2xl">{item.value}</strong>
              <p className="mt-1 text-sm text-white/55">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="space-y-3">
        {rows.map((client) => (
          <div key={client.id} className="space-y-2">
            <div className="flex flex-wrap gap-2 text-xs text-white/50">
              <span>Cadastro: {new Date(client.createdAt).toLocaleDateString("pt-BR")}</span>
              <span>·</span>
              <span>{ACCESS_STATUS_LABELS[client.status]}</span>
              <span>·</span>
              <span>{COMMERCIAL_STAGE_LABELS[client.commercialStage]}</span>
            </div>
            <ClientActions client={client} mode="approvals" />
          </div>
        ))}
        {!rows.length ? (
          <Card>
            <CardContent className="p-6 text-white/65">Nenhum lead no funil de aprovacao no momento.</CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
