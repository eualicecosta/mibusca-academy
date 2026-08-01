"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** Portal-based ⋮ menu that is never clipped by table overflow. */
export function ActionMenu({
  children,
  align = "end",
  label = "Abrir acoes"
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth || 220;
      const panelHeight = panelRef.current?.offsetHeight || 240;
      const gap = 6;
      const spaceRight = window.innerWidth - rect.right;
      const openLeft = align === "end" || spaceRight < panelWidth + 12;
      const left = openLeft
        ? Math.max(8, rect.right - panelWidth)
        : Math.min(rect.left, window.innerWidth - panelWidth - 8);
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const top =
        spaceBelow < panelHeight && rect.top > panelHeight + gap
          ? Math.max(8, rect.top - panelHeight - gap)
          : Math.min(rect.bottom + gap, Math.max(8, window.innerHeight - panelHeight - 8));
      setCoords({ top, left });
    }

    place();
    const id = requestAnimationFrame(() => place());
    return () => cancelAnimationFrame(id);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function place() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth || 220;
      const panelHeight = panelRef.current?.offsetHeight || 240;
      const gap = 6;
      const spaceRight = window.innerWidth - rect.right;
      const openLeft = align === "end" || spaceRight < panelWidth + 12;
      const left = openLeft
        ? Math.max(8, rect.right - panelWidth)
        : Math.min(rect.left, window.innerWidth - panelWidth - 8);
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const top =
        spaceBelow < panelHeight && rect.top > panelHeight + gap
          ? Math.max(8, rect.top - panelHeight - gap)
          : Math.min(rect.bottom + gap, Math.max(8, window.innerHeight - panelHeight - 8));
      setCoords({ top, left });
    }

    function onPointerDown(event: MouseEvent) {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-white/80 transition",
          "hover:border-[#8A1DEE]/50 hover:bg-white/8 hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE]/50"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role="menu"
              className="z-[80] w-56 rounded-xl border border-white/10 bg-[#151019] p-1 shadow-2xl"
              style={{ position: "fixed", top: coords.top, left: coords.left }}
            >
              <div onClick={() => setOpen(false)}>{children}</div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function ActionMenuItem({
  children,
  onClick,
  disabled,
  destructive,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
        "hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1DEE]/40",
        "disabled:cursor-not-allowed disabled:opacity-45",
        destructive ? "text-red-300 hover:bg-red-500/10" : "text-white/86",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
