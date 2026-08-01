"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@prisma/client";
import { CreditCard, Eye, Loader2, Pause, Play, Plus, RefreshCw, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionMenu, ActionMenuItem } from "@/components/admin/action-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/admin-labels";
import { createSaleForSeller } from "@/lib/client-actions";
import {
  inviteTeamMember,
  resendTeamInvite,
  revokeTeamInvite,
  setTeamMemberAccess,
  updateTeamMemberRole
} from "@/lib/team-actions";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: string;
};

export type TeamInviteRow = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  status: string;
};

export type ClientPick = { id: string; name: string; email: string };

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
          setMessage(result.ok ? result.message || "Convite registrado." : result.error || "Falha ao convidar");
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
  member,
  clients
}: {
  member: TeamMember;
  clients: ClientPick[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? result.message || "Ok" : result.error || "Erro");
    });
  }

  return (
    <div className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_1.2fr_140px_120px_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-bold text-white">{member.name}</p>
        <p className="text-xs text-white/45">Desde {new Date(member.createdAt).toLocaleDateString("pt-BR")}</p>
      </div>
      <p className="break-all text-sm text-white/65">{member.email}</p>
      <p className="text-sm font-semibold text-white/80">{ROLE_LABELS[member.role]}</p>
      <p className="text-xs uppercase tracking-wide text-white/50">{member.status}</p>
      <div className="flex items-center justify-end gap-2">
        <ActionMenu>
          <ActionMenuItem onClick={() => router.push("/perfil")}>
            <Eye className="h-4 w-4 text-[#8A1DEE]" />
            Ver perfil
          </ActionMenuItem>
          {member.status === "ACTIVE" ? (
            <ActionMenuItem
              disabled={pending}
              onClick={() => {
                if (window.confirm("Pausar acesso deste membro?")) {
                  run(() => setTeamMemberAccess(member.id, "PAUSED"));
                }
              }}
            >
              <Pause className="h-4 w-4 text-[#8A1DEE]" />
              Pausar acesso
            </ActionMenuItem>
          ) : (
            <ActionMenuItem disabled={pending} onClick={() => run(() => setTeamMemberAccess(member.id, "ACTIVE"))}>
              <Play className="h-4 w-4 text-[#8A1DEE]" />
              Ativar acesso
            </ActionMenuItem>
          )}
          <ActionMenuItem disabled={pending} onClick={() => setRoleOpen(true)}>
            <UserCog className="h-4 w-4 text-[#8A1DEE]" />
            Alterar funcao
          </ActionMenuItem>
          {member.role === "SELLER" ? (
            <ActionMenuItem disabled={pending} onClick={() => setSaleOpen(true)}>
              <CreditCard className="h-4 w-4 text-[#8A1DEE]" />
              Lancar venda
            </ActionMenuItem>
          ) : null}
        </ActionMenu>
        {message ? <span className="sr-only" role="status">{message}</span> : null}
      </div>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Alterar funcao</DialogTitle>
          <p className="text-sm text-white/60">
            {member.name} e atualmente <strong className="text-white">{ROLE_LABELS[member.role]}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            {member.role === "SELLER" ? (
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateTeamMemberRole(member.id, "ADMIN");
                    setMessage(result.ok ? result.message || "Ok" : result.error || "Erro");
                    if (result.ok) setRoleOpen(false);
                  })
                }
              >
                Tornar administrador
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Rebaixar este administrador para vendedor?")) return;
                  startTransition(async () => {
                    const result = await updateTeamMemberRole(member.id, "SELLER");
                    setMessage(result.ok ? result.message || "Ok" : result.error || "Erro");
                    if (result.ok) setRoleOpen(false);
                  });
                }}
              >
                Tornar vendedor
              </Button>
            )}
            <Button variant="secondary" onClick={() => setRoleOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LaunchSaleDialog open={saleOpen} onOpenChange={setSaleOpen} seller={member} clients={clients} />
    </div>
  );
}

function LaunchSaleDialog({
  open,
  onOpenChange,
  seller,
  clients
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seller: TeamMember;
  clients: ClientPick[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Lancar venda</DialogTitle>
        <p className="text-sm text-white/60">
          Vendedor: <strong className="text-white">{seller.name}</strong>
        </p>
        <form
          className="grid gap-3"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await createSaleForSeller(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onOpenChange(false);
            });
          }}
        >
          <input type="hidden" name="sellerId" value={seller.id} />
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Cliente
            <select name="clientId" required className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white">
              <option value="">Selecionar cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Valor (R$)
            <input name="paidAmount" required className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Data da venda
            <input name="soldAt" type="date" defaultValue={today} className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Status inicial
            <select name="status" defaultValue="CONFIRMED" className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white">
              <option value="CONFIRMED">Confirmada</option>
              <option value="PENDING">Pendente</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Observacao
            <textarea name="notes" rows={2} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Registrar venda
            </Button>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeamInviteRow({ invite }: { invite: TeamInviteRow }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="grid gap-2 border-b border-white/10 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1.4fr_120px_120px_auto] md:items-center">
      <p className="break-all font-semibold">{invite.email}</p>
      <p>{invite.role === "ADMIN" ? "Administrador" : "Vendedor"}</p>
      <p className="text-white/50">{new Date(invite.createdAt).toLocaleDateString("pt-BR")}</p>
      <div className="flex justify-end">
        <ActionMenu>
          <ActionMenuItem
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await resendTeamInvite(invite.id);
                setMessage(result.ok ? result.message || "Ok" : result.error || "Erro");
              })
            }
          >
            <RefreshCw className="h-4 w-4 text-[#8A1DEE]" />
            Reenviar convite
          </ActionMenuItem>
          <ActionMenuItem
            destructive
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Revogar este convite na Clerk e remover da lista?")) return;
              startTransition(async () => {
                const result = await revokeTeamInvite(invite.id);
                setMessage(result.ok ? result.message || "Ok" : result.error || "Erro");
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
            Excluir convite
          </ActionMenuItem>
        </ActionMenu>
      </div>
      {message ? <p className="text-xs text-white/55 md:col-span-4">{message}</p> : null}
    </div>
  );
}
