"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home,
  course: BookOpen,
  profile: UserRound,
  admin: ShieldCheck
} satisfies Record<string, LucideIcon>;

export type ShellNavIcon = keyof typeof ICONS;

export function ShellNavLink({
  href,
  label,
  icon,
  prefetch = true
}: {
  href: string;
  label: string;
  /** Icon key resolved on the client — never pass component functions from Server Components. */
  icon: ShellNavIcon;
  prefetch?: boolean;
}) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = ICONS[icon];

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/75 transition",
        "pointer-events-auto touch-manipulation",
        "hover:bg-white/10 hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/50",
        active && "bg-[var(--primary)]/25 text-white shadow-[inset_0_0_0_1px_rgba(138,29,238,0.35)]"
      )}
    >
      <Icon className="pointer-events-none h-5 w-5" aria-hidden />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
