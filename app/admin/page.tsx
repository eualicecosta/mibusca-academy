import Link from "next/link";
import { BookOpen, Clock, EyeOff, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireAdmin();
  const [pending, active, refused, modules, lessons] = await Promise.all([
    prisma.userProfile.count({ where: { role: "STUDENT", status: "PENDING" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.userProfile.count({ where: { role: "STUDENT", status: "REFUSED" } }),
    prisma.module.count(),
    prisma.lesson.count()
  ]);

  const cards = [
    { label: "Pendentes", value: pending, icon: Clock, href: "/admin/aprovacoes" },
    { label: "Ativos", value: active, icon: Users, href: "/admin/membros" },
    { label: "Pausados", value: refused, icon: EyeOff, href: "/admin" },
    { label: "Modulos", value: modules, icon: BookOpen, href: "/admin/conteudo" },
    { label: "Aulas", value: lessons, icon: BookOpen, href: "/admin/conteudo" }
  ];

  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Painel administrativo</p>
          <h1 className="mt-2 break-words text-4xl font-bold">Administracao</h1>
          <p className="mt-3 break-words text-white/62">Aprovacoes, membros, conteudo e imagens do curso.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <Link key={card.label} href={card.href}>
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

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link className="rounded-lg bg-[#53009F] px-4 py-3 font-bold hover:bg-[#8A1DEE]" href="/admin/aprovacoes">
              Aprovacoes pendentes
            </Link>
            <Link className="rounded-lg border border-white/10 px-4 py-3 font-bold text-white/72 hover:bg-white/8" href="/admin/membros">
              Membros ativos
            </Link>
            <Link className="rounded-lg border border-white/10 px-4 py-3 font-bold text-white/72 hover:bg-white/8" href="/admin/conteudo">
              Editor de conteudo
            </Link>
            <Link className="rounded-lg border border-white/10 px-4 py-3 font-bold text-white/72 hover:bg-white/8" href="/admin/imagens">
              Banco de imagens
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
