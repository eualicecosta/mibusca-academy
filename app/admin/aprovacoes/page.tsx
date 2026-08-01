import { Suspense } from "react";
import { ApprovalQueue } from "@/components/admin/approval-queue";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Aprovações</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Aprovações pendentes</h1>
        <p className="mt-3 text-white/62">
          Analise novos cadastros e defina a função no momento da aprovação: Cliente, Vendedor ou Administrador.
        </p>
      </header>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />}>
        <ApprovalsContent />
      </Suspense>
    </div>
  );
}

async function ApprovalsContent() {
  const [pendingCount, students] = await Promise.all([
    prisma.userProfile.count({
      where: { status: "PENDING", deletedAt: null }
    }),
    prisma.userProfile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: "PENDING" },
          {
            status: { in: ["PENDING", "ACTIVE"] },
            commercialStage: {
              in: ["NEW_LEAD", "CONTACT_MADE", "AWAITING_PAYMENT", "PAYMENT_CONFIRMED", "AWAITING_REGISTRATION", "AWAITING_APPROVAL"]
            },
            role: "STUDENT"
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
        role: true,
        createdAt: true
      }
    })
  ]);

  // Prefer true pending approvals first in the queue UI.
  const pending = students.filter((s) => s.status === "PENDING");
  const others = students.filter((s) => s.status !== "PENDING");
  const queue = [...pending, ...others];

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <strong className="text-2xl">{pendingCount}</strong>
            <p className="mt-1 text-sm text-white/55">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <strong className="text-2xl">{queue.length}</strong>
            <p className="mt-1 text-sm text-white/55">Itens na fila comercial</p>
          </CardContent>
        </Card>
      </section>

      <ApprovalQueue
        items={queue.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          status: s.status,
          commercialStage: s.commercialStage,
          role: s.role,
          createdAt: s.createdAt.toISOString()
        }))}
      />
    </>
  );
}
