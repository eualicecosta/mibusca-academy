"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastKind = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op outside provider (SSR / partial trees).
    return {
      toast: () => undefined,
      success: () => undefined,
      error: () => undefined,
      warning: () => undefined,
      info: () => undefined
    } satisfies ToastContextValue;
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev.slice(-4), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      warning: (m) => push(m, "warning"),
      info: (m) => push(m, "info")
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-3 top-3 z-[200] flex w-[min(100vw-1.5rem,22rem)] flex-col gap-2 sm:right-4 sm:top-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon =
    item.kind === "success"
      ? CheckCircle2
      : item.kind === "error"
        ? XCircle
        : item.kind === "warning"
          ? AlertTriangle
          : Info;

  useEffect(() => {
    // no-op — keeps card mounted lifecycle clean
  }, []);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-2xl backdrop-blur-md",
        "bg-[#151019]/95 text-[#F5F3F3]",
        item.kind === "success" && "border-emerald-400/40",
        item.kind === "error" && "border-red-400/45",
        item.kind === "warning" && "border-amber-400/45",
        item.kind === "info" && "border-[#8A1DEE]/45"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          item.kind === "success" && "text-emerald-400",
          item.kind === "error" && "text-red-400",
          item.kind === "warning" && "text-amber-400",
          item.kind === "info" && "text-[#b07af5]"
        )}
      />
      <p className="min-w-0 flex-1 text-sm leading-snug text-white/90">{item.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
        aria-label="Fechar notificação"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
