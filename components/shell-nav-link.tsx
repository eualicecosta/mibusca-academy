"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShellNavLink({
  href,
  label,
  icon: Icon,
  prefetch = true
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  prefetch?: boolean;
}) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      prefetch={prefetch}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition",
        "hover:bg-white/10 hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/50",
        active && "bg-[var(--primary)]/25 text-white shadow-[inset_0_0_0_1px_rgba(138,29,238,0.35)]"
      )}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}
