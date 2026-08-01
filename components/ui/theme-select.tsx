"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemeSelectOption = { value: string; label: string };

/** Dark-themed select with portal list (avoids native light OS dropdown). */
export function ThemeSelect({
  name,
  value,
  defaultValue,
  options,
  onChange,
  placeholder = "Selecionar",
  disabled,
  className,
  required
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: ThemeSelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(value ?? defaultValue ?? "");
  const current = value !== undefined ? value : internal;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const listId = useId();

  useEffect(() => {
    if (value !== undefined) setInternal(value);
  }, [value]);

  function place() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const listHeight = Math.min(280, (options.length || 1) * 40 + 16);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < listHeight && rect.top > listHeight;
    setCoords({
      top: openUp ? Math.max(8, rect.top - listHeight - 6) : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - rect.width - 8),
      width: rect.width
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const selected = options.find((o) => o.value === current);

  function pick(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      {name ? <input type="hidden" name={name} value={current} required={required && !current} /> : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-3 text-left text-sm text-white outline-none transition",
          "hover:border-white/20 focus-visible:border-[#8A1DEE] focus-visible:ring-2 focus-visible:ring-[#8A1DEE]/40",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={cn("truncate", !selected && "text-white/45")}>{selected?.label || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/55 transition", open && "rotate-180")} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              className="z-[120] max-h-70 overflow-y-auto rounded-xl border border-white/10 bg-[#151019] p-1 shadow-2xl"
              style={{ position: "fixed", top: coords.top, left: coords.left, width: Math.max(coords.width, 160) }}
            >
              {options.map((opt) => {
                const active = opt.value === current;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                      active ? "bg-[#8A1DEE]/25 text-white" : "text-white/80 hover:bg-white/8"
                    )}
                    onClick={() => pick(opt.value)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-[#B76CFF]" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
