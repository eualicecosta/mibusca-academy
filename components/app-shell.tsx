import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { ShellNavLink, type ShellNavIcon } from "@/components/shell-nav-link";
import { cn } from "@/lib/utils";

const nav: Array<{ href: string; label: string; icon: ShellNavIcon; prefetch?: boolean }> = [
  { href: "/dashboard", label: "Dashboard", icon: "home", prefetch: true },
  { href: "/curso", label: "Curso", icon: "course", prefetch: true },
  { href: "/perfil", label: "Perfil", icon: "profile", prefetch: true },
  { href: "/admin", label: "Admin", icon: "admin", prefetch: true }
];

export function AppShell({
  children,
  showAdmin = false,
  userName,
  userEmail,
  className,
  mainClassName,
  headerClassName
}: {
  children: React.ReactNode;
  showAdmin?: boolean;
  /** Prefer values already loaded from UserProfile — avoids Clerk currentUser() API on every navigation. */
  userName: string;
  userEmail: string;
  className?: string;
  mainClassName?: string;
  headerClassName?: string;
}) {
  const email = userEmail || "";
  const name = userName || email.split("@")[0] || "Usuario";
  const items = showAdmin ? nav : nav.filter((item) => item.href !== "/admin");

  return (
    <div className={cn("min-h-screen bg-[var(--background)] text-[var(--foreground)]", className)}>
      <aside className="pointer-events-auto fixed left-0 top-0 z-40 hidden h-screen w-[72px] border-r border-[var(--border)] bg-[var(--surface-elevated)] md:flex md:flex-col md:items-center md:gap-5 md:py-5">
        <Link
          href="/dashboard"
          className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold shadow-lg shadow-[var(--primary)]/20"
          prefetch
          aria-label="MiBusca Academy - Dashboard"
        >
          M
        </Link>
        <nav className="relative z-10 flex flex-col gap-2" aria-label="Navegacao principal">
          {items.map((item) => (
            <ShellNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} prefetch={item.prefetch !== false} />
          ))}
        </nav>
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
          "sticky top-0 z-30 flex h-[72px] min-w-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur-md md:pl-[104px] md:pr-8",
          headerClassName
        )}
      >
        <div className="min-w-0">
          <Link href="/dashboard" className="block min-w-0 truncate text-lg font-bold tracking-tight" prefetch>
            Area de Membros
          </Link>
          <p className="hidden truncate text-xs text-[var(--muted-foreground)] sm:block">MiBusca Academy</p>
        </div>
        <AccountMenu name={name} email={email} showAdmin={showAdmin} />
      </header>
      <main
        className={cn(
          "min-w-0 max-w-full overflow-x-hidden px-4 py-8 pb-24 md:pl-[104px] md:pr-8 md:pb-8",
          mainClassName
        )}
      >
        <div className="min-w-0 max-w-full">{children}</div>
      </main>
    </div>
  );
}
