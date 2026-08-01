"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Loader2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initialsFromName(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "Usuario";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${first || ""}${second || ""}`.toUpperCase();
}

export function AccountMenu({
  name,
  email,
  imageUrl,
  showAdmin = false
}: {
  name: string;
  email: string;
  imageUrl?: string | null;
  showAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initials = initialsFromName(name, email);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex min-w-0 items-center justify-end">
      <button
        type="button"
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5 pr-3 shadow-sm outline-none transition",
          "hover:border-[var(--border-hover)] hover:bg-white/[0.07]",
          "focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40",
          open && "border-[var(--border-hover)] bg-white/[0.07]"
        )}
        aria-label="Menu da conta"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar className="h-10 w-10 border border-white/15 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="bg-transparent text-sm font-semibold">{initials}</AvatarFallback>
          )}
        </Avatar>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold leading-5 text-[var(--foreground)]">{name}</span>
          <span className="block max-w-[200px] truncate text-xs font-medium leading-4 text-[var(--muted-foreground)]">{email}</span>
        </span>
        <span className="hidden text-[10px] text-[var(--muted-foreground)] md:inline" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Opcoes da conta"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 origin-top-right animate-menu-in rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2 shadow-2xl shadow-black/40"
        >
          <div className="mb-2 border-b border-[var(--border)] px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{name}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{email}</p>
            {showAdmin ? (
              <p className="mt-2 inline-flex rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--secondary)]">
                Administrador
              </p>
            ) : (
              <p className="mt-2 inline-flex rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                Aluno
              </p>
            )}
          </div>

          <Link
            role="menuitem"
            href="/perfil"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
            onClick={() => setOpen(false)}
          >
            <UserRound className="h-4 w-4 text-[var(--secondary)]" />
            Meu perfil
          </Link>

          {showAdmin ? (
            <Link
              role="menuitem"
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck className="h-4 w-4 text-[var(--secondary)]" />
              Painel administrativo
            </Link>
          ) : null}

          <div className="my-1 border-t border-[var(--border)]" />

          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none disabled:opacity-60"
              onClick={() => {
                startSignOut(() => {
                  setOpen(false);
                });
              }}
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {signingOut ? "Saindo..." : "Sair da conta"}
            </button>
          </SignOutButton>
        </div>
      ) : null}
    </div>
  );
}
