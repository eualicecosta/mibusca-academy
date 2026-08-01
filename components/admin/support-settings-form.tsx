"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupportConfig } from "@/lib/support";
import { updateSupportSettings } from "@/lib/settings-actions";

export function SupportSettingsForm({ settings }: { settings: SupportConfig }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(settings.supportEnabled);

  return (
    <form
      className="grid gap-4"
      action={(formData) => {
        formData.set("supportEnabled", enabled ? "true" : "false");
        setMessage(null);
        setError(null);
        startTransition(async () => {
          const result = await updateSupportSettings(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message || "Salvo");
        });
      }}
    >
      <label className="grid gap-1 text-xs font-semibold text-white/60">
        Nome do suporte
        <input
          name="supportName"
          defaultValue={settings.supportName}
          required
          className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-white/60">
        Número do WhatsApp
        <input
          name="supportWhatsApp"
          defaultValue={settings.supportWhatsApp}
          placeholder="+55 71 99999-9999"
          className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-white/60">
        Mensagem padrão
        <textarea
          name="supportDefaultMessage"
          defaultValue={settings.supportDefaultMessage}
          rows={3}
          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#8A1DEE]"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-white/60">
        E-mail de suporte (opcional)
        <input
          name="supportEmail"
          type="email"
          defaultValue={settings.supportEmail || ""}
          className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-white/60">
        Horário de atendimento (opcional)
        <input
          name="supportBusinessHours"
          defaultValue={settings.supportBusinessHours || ""}
          placeholder="Seg a Sex, 9h às 18h"
          className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white/75">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-[#8A1DEE]" />
        Suporte ativo
      </label>

      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="text-sm text-red-200">{error}</p> : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar configurações
      </Button>
    </form>
  );
}
