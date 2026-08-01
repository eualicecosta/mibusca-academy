import Link from "next/link";
import { BookOpen, Home, ShieldCheck, UserRound } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { ShellNavLink } from "@/components/shell-nav-link";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home, prefetch: true },
  { href: "/curso", label: "Curso", icon: BookOpen, prefetch: true },
  { href: "/perfil", label: "Perfil", icon: UserRound, prefetch: true },
  { href: "/admin", label: "Admin", icon: ShieldCheck, prefetch: true }
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
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-[var(--border)] bg-[var(--surface-elevated)] md:flex md:flex-col md:items-center md:gap-5 md:py-5">
        <Link
          href="/dashboard"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold shadow-lg shadow-[var(--primary)]/20"
          prefetch
          aria-label="MiBusca Academy"
        >
          M
        </Link>
        <nav className="flex flex-col gap-2" aria-label="Navegacao principal">
          {items.map((item) => (
            <ShellNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} prefetch={item.prefetch} />
          ))}
        </nav>
      </aside>
      <header
        className={cn(
          "sticky top-0 z-20 flex h-[72px] min-w-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur-md md:pl-[104px] md:pr-8",
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
      <main className={cn("min-w-0 overflow-x-hidden px-4 py-8 md:pl-[104px] md:pr-8", mainClassName)}>{children}</main>
    </div>
  );
}
