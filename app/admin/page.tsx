import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Clock, EyeOff, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export default async function AdminPage() {
  const authStartedAt = isDev ? performance.now() : 0;
  const profile = await requireAdmin();
  if (isDev) {
    console.info(`[perf] admin.home.requireAdmin ${Math.round(performance.now() - authStartedAt)}ms`);
  }

  return (
    <AppShell showAdmin={profile.role === "ADMIN"} userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Painel administrativo</p>
          <h1 className="mt-2 break-words text-4xl font-bold">Administracao</h1>
          <p className="mt-3 break-words text-white/62">Aprovacoes, membros, conteudo e imagens do curso.</p>
        </header>

        <Suspense fallback={<AdminStatsSkeleton />}>
          <AdminStatsCards />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link className="rounded-lg bg-[#53009F] px-4 py-3 font-bold hover:bg-[#8A1DEE]" href="/admin/aprovacoes" prefetch>
              Aprovacoes pendentes
            </Link>
            <Link className="rounded-lg border border-white/10 px-4 py-3 font-bold text-white/72 hover:bg-white/8" href="/admin/membros" prefetch>
              Membros ativos
            </Link>
            {/* Conteúdo/imagens: payload pesado — sem prefetch automático forçado */}
            <Link className="rounded-lg border border-white/10 px-4 py-3 font-bold text-white/72 hover:bg-white/8" href="/admin/conteudo">
              Editor de conteudo
            </Link>
            <Link className="rounded-lg border border-white/10 px-4 py-3 font-bold text-white/72 hover:bg-white/8" href="/admin/imagens" prefetch={false}>
              Banco de imagens
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

async function AdminStatsCards() {
  const startedAt = isDev ? performance.now() : 0;
  const [pending, active, refused, modules, lessons] = await Promise.all([
    prisma.userProfile.count({ where: { role: "STUDENT", status: "PENDING" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: "REFUSED" } }),
    prisma.module.count(),
    prisma.lesson.count()
  ]);
  if (isDev) {
    console.info(`[perf] admin.home.counts ${Math.round(performance.now() - startedAt)}ms`);
  }

  const cards = [
    { label: "Pendentes", value: pending, icon: Clock, href: "/admin/aprovacoes", prefetch: true as const },
    { label: "Ativos", value: active, icon: Users, href: "/admin/membros", prefetch: true as const },
    { label: "Pausados", value: refused, icon: EyeOff, href: "/admin", prefetch: false as const },
    { label: "Modulos", value: modules, icon: BookOpen, href: "/admin/conteudo", prefetch: false as const },
    { label: "Aulas", value: lessons, icon: BookOpen, href: "/admin/conteudo", prefetch: false as const }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} prefetch={card.prefetch}>
          <Card className="hover:border-[#8A1DEE]/50">
            <CardContent className="p-5">
              <card.icon className="mb-4 h-5 w-5 text-[#8A1DEE]" />
              <strong className="text-4xl">{card.value}</strong>
              <p className="mt-1 text-sm text-white/58">{card.label}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

function AdminStatsSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-busy="true" aria-label="Carregando metricas">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      ))}
    </section>
  );
}
