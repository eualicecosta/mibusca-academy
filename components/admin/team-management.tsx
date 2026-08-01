"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@prisma/client";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/admin-labels";
import { inviteTeamMember, setTeamMemberAccess, updateTeamMemberRole } from "@/lib/team-actions";

export function TeamInviteForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await inviteTeamMember(formData);
          setMessage(result.ok ? "Convite registrado." : result.error || "Falha ao convidar");
        });
      }}
    >
      <label className="grid gap-1 text-xs text-white/60 md:col-span-1">
        Nome
        <input name="name" className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white" />
      </label>
      <label className="grid gap-1 text-xs text-white/60 md:col-span-1">
        E-mail
        <input name="email" type="email" required className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white" />
      </label>
      <label className="grid gap-1 text-xs text-white/60">
        Funcao
        <select name="role" defaultValue="SELLER" className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white">
          <option value="SELLER">Vendedor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo membro
        </Button>
      </div>
      {message ? <p className="text-sm text-white/70 md:col-span-4">{message}</p> : null}
    </form>
  );
}

export function TeamMemberRow({
  member
}: {
  member: { id: string; name: string; email: string; role: UserRole; status: string; createdAt: string };
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_1.2fr_140px_120px_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-bold text-white">{member.name}</p>
        <p className="text-xs text-white/45">Desde {new Date(member.createdAt).toLocaleDateString("pt-BR")}</p>
      </div>
      <p className="break-all text-sm text-white/65">{member.email}</p>
      <p className="text-sm font-semibold text-white/80">{ROLE_LABELS[member.role]}</p>
      <p className="text-xs uppercase tracking-wide text-white/50">{member.status}</p>
      <div className="flex flex-wrap gap-2">
        {member.role === "SELLER" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateTeamMemberRole(member.id, "ADMIN");
                setMessage(result.ok ? "Promovido a admin." : result.error || "Erro");
              })
            }
          >
            Tornar admin
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Rebaixar este administrador para vendedor?")) {
                startTransition(async () => {
                  const result = await updateTeamMemberRole(member.id, "SELLER");
                  setMessage(result.ok ? "Funcao atualizada." : result.error || "Erro");
                });
              }
            }}
          >
            Tornar vendedor
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => void setTeamMemberAccess(member.id, "PAUSED"))}>
          Pausar
        </Button>
        <Button size="sm" disabled={pending} onClick={() => startTransition(() => void setTeamMemberAccess(member.id, "ACTIVE"))}>
          Ativar
        </Button>
        {message ? <p className="w-full text-xs text-white/60">{message}</p> : null}
      </div>
    </div>
  );
}
