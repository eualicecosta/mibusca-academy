import Link from "next/link";
import { BookOpen, Home, ShieldCheck, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/curso", label: "Curso", icon: BookOpen },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

function initialsFromName(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "Usuario";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${first || ""}${second || ""}`.toUpperCase();
}

function UserIdentityCard({ name, email }: { name: string; email: string }) {
  const initials = initialsFromName(name, email);

  return (
    <div className="group relative flex min-w-0 items-center justify-end">
      <button
        type="button"
        className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 pr-4 shadow-sm outline-none transition hover:border-[#8A1DEE]/55 hover:bg-white/[0.07] focus-visible:border-[#8A1DEE]"
        aria-label={`${name}, ${email}`}
      >
        <Avatar className="h-10 w-10 border border-white/15 bg-gradient-to-br from-[#53009F] to-[#8A1DEE]">
          <AvatarFallback className="bg-transparent text-sm">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-[180px] truncate text-sm font-bold leading-5 text-white">{name}</span>
          <span className="block max-w-[220px] truncate text-xs font-medium leading-4 text-white/52">{email}</span>
        </span>
      </button>
      <div className="absolute right-0 top-14 z-40 hidden w-64 rounded-2xl border border-white/10 bg-[#151019] p-3 shadow-2xl group-focus-within:block md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 border border-white/15 bg-gradient-to-br from-[#53009F] to-[#8A1DEE]">
            <AvatarFallback className="bg-transparent text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            <p className="truncate text-xs font-medium text-white/52">{email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className={cn("min-h-screen bg-[#09070d] text-[#F5F3F3]", className)}>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-white/10 bg-[#121015] md:flex md:flex-col md:items-center md:gap-5 md:py-5">
        <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-bold" prefetch>
          M
        </Link>
        <nav className="flex flex-col gap-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              prefetch
              className={cn("flex h-11 w-11 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white")}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          ))}
        </nav>
      </aside>
      <header className={cn("sticky top-0 z-20 flex h-[72px] min-w-0 items-center justify-between gap-4 border-b border-white/10 bg-[#111017]/95 px-4 backdrop-blur md:pl-[104px] md:pr-8", headerClassName)}>
        <Link href="/dashboard" className="min-w-0 break-words text-lg font-bold" prefetch>
          Area de Membros
        </Link>
        <UserIdentityCard name={name} email={email} />
      </header>
      <main className={cn("min-w-0 overflow-x-hidden px-4 py-8 md:pl-[104px] md:pr-8", mainClassName)}>{children}</main>
    </div>
  );
}
