"use client";

import { useTransition } from "react";
import { Eye, Loader2, Shield } from "lucide-react";
import { clearViewAsRoleAndGo } from "@/lib/preview-actions";
import { Button } from "@/components/ui/button";

export function RolePreviewBanner({ asRole }: { asRole: "STUDENT" | "SELLER" }) {
  const [pending, startTransition] = useTransition();
  const label = asRole === "SELLER" ? "Vendedor" : "Cliente";

  return (
    <div className="z-20 border-b border-amber-400/30 bg-amber-500/15 px-4 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
          <Eye className="h-4 w-4 shrink-0" />
          Você está testando a plataforma como {label}. A função real de administrador não foi alterada.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(() => void clearViewAsRoleAndGo())}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Voltar ao modo administrador
        </Button>
      </div>
    </div>
  );
}
