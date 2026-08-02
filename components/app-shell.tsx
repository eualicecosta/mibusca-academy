"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { ShellNavLink, type ShellNavIcon } from "@/components/shell-nav-link";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "mibusca.member.sidebar.collapsed";

const studentNav: Array<{ href: string; label: string; icon: ShellNavIcon; prefetch?: boolean }> = [
  { href: "/dashboard", label: "Início", icon: "home", prefetch: true },
  { href: "/curso", label: "Curso", icon: "course", prefetch: true },
  { href: "/perfil", label: "Perfil", icon: "profile", prefetch: true }
];

const sellerNav: Array<{ href: string; label: string; icon: ShellNavIcon; prefetch?: boolean }> = [
  { href: "/vendedor", label: "Início", icon: "home", prefetch: true },
  { href: "/perfil", label: "Perfil", icon: "profile", prefetch: true }
];

const adminExtra: Array<{ href: string; label: string; icon: ShellNavIcon; prefetch?: boolean }> = [
  { href: "/admin", label: "Admin", icon: "admin", prefetch: true }
];

export function AppShell({
  children,
  showAdmin = false,
  variant = "student",
  userName,
  userEmail,
  className,
  mainClassName,
  headerClassName,
  isRolePreview = false,
  supportHref,
  previewBanner,
  /** Locks shell to the viewport and makes main the only flexible region (lesson dual-scroll). */
  fillViewport = false
}: {
  children: React.ReactNode;
  showAdmin?: boolean;
  /** student | seller — controls member-area navigation */
  variant?: "student" | "seller";
  /** Prefer values already loaded from UserProfile — avoids Clerk currentUser() API on every navigation. */
  userName: string;
  userEmail: string;
  className?: string;
  mainClassName?: string;
  headerClassName?: string;
  isRolePreview?: boolean;
  supportHref?: string | null;
  previewBanner?: React.ReactNode;
  fillViewport?: boolean;
}) {
  const email = userEmail || "";
  const name = userName || email.split("@")[0] || "Usuario";
  const base = variant === "seller" ? sellerNav : studentNav;
  // effectiveRole drives chrome: never inject admin shield/link while previewing as client/seller.
  const items = showAdmin === true && isRolePreview !== true ? [...base, ...adminExtra] : base;

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // ignore
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

  const showDesktopAside = !hydrated || !collapsed;
  const desktopExpanded = hydrated && !collapsed;

  return (
    <div
      className={cn(
        "bg-[var(--background)] text-[var(--foreground)]",
        fillViewport ? "flex h-dvh max-h-dvh flex-col overflow-hidden" : "min-h-screen",
        className
      )}
    >
      <aside
        className={cn(
          "pointer-events-auto fixed left-0 top-0 z-40 hidden h-screen border-r border-[var(--border)] bg-[var(--surface-elevated)] transition-[width,transform] duration-200 ease-out md:flex md:flex-col md:items-center md:gap-4 md:py-4",
          showDesktopAside ? "w-[72px] translate-x-0" : "pointer-events-none w-0 -translate-x-full border-0"
        )}
        aria-hidden={!showDesktopAside}
      >
        {showDesktopAside ? (
          <>
            <Link
              href="/dashboard"
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold shadow-lg shadow-[var(--primary)]/20"
              prefetch
              aria-label="MiBusca Academy - Dashboard"
            >
              M
            </Link>
            <nav className="relative z-10 flex flex-1 flex-col gap-2" aria-label="Navegacao principal">
              {items.map((item) => (
                <ShellNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} prefetch={item.prefetch !== false} />
              ))}
            </nav>
            <button
              type="button"
              className="relative z-10 rounded-lg border border-[var(--border)] p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Minimizar menu lateral"
              title="Minimizar menu"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </aside>

      {/* Mobile bottom navigation — sidebar is desktop-only */}
      <nav
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface-elevated)]/95 px-2 py-2 backdrop-blur md:hidden"
        aria-label="Navegacao principal mobile"
      >
        {items.map((item) => (
          <ShellNavLink key={`mobile-${item.href}`} href={item.href} label={item.label} icon={item.icon} prefetch={item.prefetch !== false} />
        ))}
      </nav>

      <header
        className={cn(
          "z-30 flex h-[72px] min-w-0 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur-md transition-[padding] duration-200 md:pr-8",
          fillViewport ? "relative" : "sticky top-0",
          desktopExpanded || !hydrated ? "md:pl-[104px]" : "md:pl-4",
          headerClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={cn(
              "hidden rounded-lg border border-[var(--border)] p-2 transition hover:bg-white/10 md:inline-flex",
              showDesktopAside && "md:hidden"
            )}
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Mostrar menu lateral"
            title="Mostrar menu"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <Link href="/dashboard" className="block min-w-0 truncate text-lg font-bold tracking-tight" prefetch>
              Area de Membros
            </Link>
            <p className="hidden truncate text-xs text-[var(--muted-foreground)] sm:block">MiBusca Academy</p>
          </div>
        </div>
        <AccountMenu
          name={name}
          email={email}
          showAdmin={showAdmin}
          isRolePreview={isRolePreview}
          supportHref={supportHref}
        />
      </header>
      {previewBanner ? <div className={cn(fillViewport && "shrink-0")}>{previewBanner}</div> : null}
      <main
        className={cn(
          "min-h-0 min-w-0 max-w-full overflow-x-hidden px-4 py-8 pb-24 transition-[padding] duration-200 md:pr-8 md:pb-8",
          fillViewport ? "flex flex-1 flex-col overflow-hidden" : "",
          desktopExpanded || !hydrated ? "md:pl-[104px]" : "md:pl-4",
          mainClassName
        )}
      >
        {/* min-h-0 + flex-1 keeps dual-scroll lesson layouts sized to the main viewport owner */}
        <div className={cn("min-h-0 min-w-0 max-w-full", fillViewport ? "flex h-full min-h-0 flex-1 flex-col" : "h-full")}>
          {children}
        </div>
      </main>
    </div>
  );
}
