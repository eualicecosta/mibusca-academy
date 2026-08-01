"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Users,
  UserCog,
  X
} from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/admin/aprovacoes", label: "Aprovacoes pendentes", icon: ClipboardList },
  { href: "/admin/clientes", label: "Clientes ativos", icon: Users },
  { href: "/admin/equipe", label: "Membros do time", icon: UserCog },
  { href: "/admin/conteudo", label: "Curso", icon: BookOpen }
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navegacao administrativa">
      {adminNav.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              "hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/50",
              active ? "bg-[var(--primary)]/25 text-white" : "text-white/75"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  userName,
  userEmail
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] border-r border-[var(--border)] bg-[var(--surface-elevated)] lg:flex lg:flex-col">
        <div className="flex h-[72px] items-center gap-3 border-b border-[var(--border)] px-4">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold"
          >
            M
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">MiBusca Admin</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">Painel comercial</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavItems />
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl">
            <div className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-4">
              <p className="font-bold">Menu admin</p>
              <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur lg:pl-[276px] lg:pr-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu administrativo"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">Administracao</p>
            <p className="hidden truncate text-xs text-[var(--muted-foreground)] sm:block">Gestao de leads, clientes e time</p>
          </div>
        </div>
        <AccountMenu name={userName} email={userEmail} showAdmin />
      </header>

      <main className="min-w-0 overflow-x-hidden px-4 py-8 lg:pl-[276px] lg:pr-8">
        <div className="min-w-0 max-w-full">{children}</div>
      </main>
    </div>
  );
}
