import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl, getSupportSettings, STATUS_SUPPORT_MESSAGES, type SupportConfig } from "@/lib/support";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "menu" | "footer" | "float";

export async function SupportButton({
  variant = "secondary",
  statusKey,
  className,
  label = "Falar com o suporte",
  settings
}: {
  variant?: Variant;
  /** Optional status-specific message key (PENDING, PAUSED, ...) */
  statusKey?: string;
  className?: string;
  label?: string;
  /** Pass preloaded settings to avoid N+1 when rendering multiple buttons */
  settings?: SupportConfig;
}) {
  const config = settings || (await getSupportSettings());
  if (!config.supportEnabled) return null;

  const message =
    (statusKey && STATUS_SUPPORT_MESSAGES[statusKey]) ||
    config.supportDefaultMessage ||
    STATUS_SUPPORT_MESSAGES.DEFAULT;

  const href = buildWhatsAppUrl(config.supportWhatsApp, message);
  if (!href) {
    if (variant === "float" || variant === "menu") return null;
    return (
      <span className={cn("text-xs text-white/45", className)}>
        Suporte WhatsApp ainda não configurado.
      </span>
    );
  }

  const base =
    variant === "primary"
      ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-bold text-[#052e16] transition hover:brightness-110"
      : variant === "menu"
        ? "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85 transition hover:bg-white/8"
        : variant === "footer"
          ? "inline-flex items-center gap-2 text-sm font-semibold text-[#B76CFF] underline-offset-4 hover:underline"
          : variant === "float"
            ? "fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-[#052e16] shadow-xl shadow-black/40 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 sm:bottom-6 sm:right-6"
            : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#25D366]/40 bg-[#25D366]/15 px-4 text-sm font-bold text-[#7CFFB2] transition hover:bg-[#25D366]/25";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={cn(base, className)}
    >
      <MessageCircle className={cn(variant === "float" ? "h-6 w-6" : "h-4 w-4 shrink-0")} />
      {variant === "float" ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </a>
  );
}
