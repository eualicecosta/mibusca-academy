"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Users,
  UserCog,
  X
} from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "mibusca.admin.sidebar.collapsed";

const adminNav = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/admin/aprovacoes", label: "Aprovacoes pendentes", icon: ClipboardList },
  { href: "/admin/clientes", label: "Clientes ativos", icon: Users },
  { href: "/admin/equipe", label: "Membros do time", icon: UserCog },
  { href: "/admin/conteudo", label: "Curso", icon: BookOpen }
];

function NavItems({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "p-2" : "p-3")} aria-label="Navegacao administrativa">
      {adminNav.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm font-semibold transition",
              "hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/50",
              active ? "bg-[var(--primary)]/25 text-white" : "text-white/75",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  userName,
  userEmail,
  userImageUrl
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userImageUrl?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Desktop: false = expanded full labels, true = hidden (content full width). */
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  function setSidebarCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  const desktopExpanded = hydrated && !collapsed;
  // Avoid layout flash before reading localStorage: assume expanded on first paint.
  const showDesktopAside = !hydrated || !collapsed;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Desktop sidebar — not permanently forced open; can be minimized */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-[var(--border)] bg-[var(--surface-elevated)] transition-[width,transform] duration-200 ease-out lg:flex lg:flex-col",
          showDesktopAside ? "w-[260px] translate-x-0" : "pointer-events-none w-0 -translate-x-full border-0"
        )}
        aria-hidden={!showDesktopAside}
      >
        {showDesktopAside ? (
          <>
            <div className="flex h-[72px] items-center gap-2 border-b border-[var(--border)] px-3">
              <Link
                href="/admin"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold"
              >
                M
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">MiBusca Admin</p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">Painel comercial</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] p-2 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/50"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Minimizar menu lateral"
                title="Minimizar menu"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavItems />
            </div>
          </>
        ) : null}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl">
            <div className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-4">
              <p className="font-bold">Menu admin</p>
              <button type="button" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <header
        className={cn(
          "sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur transition-[padding] duration-200 lg:pr-8",
          desktopExpanded || !hydrated ? "lg:pl-[276px]" : "lg:pl-4"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] p-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu administrativo"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Desktop: restore sidebar when minimized */}
          <button
            type="button"
            className={cn(
              "hidden rounded-lg border border-[var(--border)] p-2 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/50 lg:inline-flex",
              showDesktopAside && "lg:hidden"
            )}
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Mostrar menu lateral"
            title="Mostrar menu"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">Administracao</p>
            <p className="hidden truncate text-xs text-[var(--muted-foreground)] sm:block">Gestao de leads, clientes e time</p>
          </div>
        </div>
        <AccountMenu name={userName} email={userEmail} imageUrl={userImageUrl} showAdmin />
      </header>

      <main
        className={cn(
          "min-w-0 overflow-x-hidden px-4 py-8 transition-[padding] duration-200 lg:pr-8",
          desktopExpanded || !hydrated ? "lg:pl-[276px]" : "lg:pl-4"
        )}
      >
        <div className="min-w-0 max-w-full">{children}</div>
      </main>
    </div>
  );
}
