"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ApprovalStatus, CommercialStage, UserRole } from "@prisma/client";
import {
  Ban,
  CreditCard,
  Loader2,
  Pause,
  Pencil,
  Play,
  Save,
  ShieldOff,
  Trash2,
  UserCog
} from "lucide-react";
import { ActionMenu, ActionMenuItem } from "@/components/admin/action-menu";
import { RoleChangeDialog } from "@/components/admin/role-change-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ThemeSelect } from "@/components/ui/theme-select";
import { ACCESS_STATUS_LABELS, COMMERCIAL_STAGE_LABELS, formatBRLFromCents } from "@/lib/admin-labels";
import {
  archiveClient,
  markClientAsPaid,
  updateClientAccessStatus,
  updateClientProfile
} from "@/lib/client-actions";

export type SellerOption = { id: string; name: string };

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  status: ApprovalStatus;
  commercialStage: CommercialStage;
  paidAmountCents: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  adminNotes: string | null;
  blockReason: string | null;
  sellerId: string | null;
  sellerName: string | null;
  role?: UserRole;
};

function fieldClass() {
  return "min-h-10 w-full min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#8A1DEE]";
}

function labelClass() {
  return "grid gap-1 text-xs font-semibold text-white/60";
}

/** Compact row actions used on /admin/clientes table */
export function ClientRowActions({ client, sellers }: { client: ClientRow; sellers: SellerOption[] }) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, close?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage(result.error || "Falha na operacao");
        return;
      }
      setMessage(result.message || "Salvo");
      close?.();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <ActionMenu>
        <ActionMenuItem
          onClick={() => setEditOpen(true)}
          disabled={pending}
        >
          <Pencil className="h-4 w-4 text-[#8A1DEE]" />
          Editar dados
        </ActionMenuItem>
        {client.status === "PAUSED" || client.status === "CANCELLED" ? (
          <ActionMenuItem
            disabled={pending}
            onClick={() => {
              if (window.confirm("Reativar acesso deste cliente?")) {
                run(() => updateClientAccessStatus(client.id, "ACTIVE"));
              }
            }}
          >
            <Play className="h-4 w-4 text-[#8A1DEE]" />
            Reativar acesso
          </ActionMenuItem>
        ) : client.status !== "BLOCKED" ? (
          <ActionMenuItem
            disabled={pending}
            onClick={() => {
              if (window.confirm("Pausar acesso? O progresso e o historico serao preservados.")) {
                run(() => updateClientAccessStatus(client.id, "PAUSED"));
              }
            }}
          >
            <Pause className="h-4 w-4 text-[#8A1DEE]" />
            Pausar acesso
          </ActionMenuItem>
        ) : null}
        <ActionMenuItem disabled={pending} onClick={() => setPaidOpen(true)}>
          <CreditCard className="h-4 w-4 text-[#8A1DEE]" />
          Marcar como pago
        </ActionMenuItem>
        <ActionMenuItem disabled={pending} onClick={() => setRoleOpen(true)}>
          <UserCog className="h-4 w-4 text-[#8A1DEE]" />
          Alterar função
        </ActionMenuItem>
        {client.status === "BLOCKED" ? (
          <ActionMenuItem
            disabled={pending}
            onClick={() => {
              if (window.confirm("Desbloquear este cliente?")) {
                run(() => updateClientAccessStatus(client.id, "ACTIVE"));
              }
            }}
          >
            <ShieldOff className="h-4 w-4 text-[#8A1DEE]" />
            Desbloquear acesso
          </ActionMenuItem>
        ) : (
          <ActionMenuItem disabled={pending} onClick={() => setBlockOpen(true)} destructive>
            <Ban className="h-4 w-4" />
            Bloquear acesso
          </ActionMenuItem>
        )}
      </ActionMenu>

      {message ? <span className="sr-only" role="status">{message}</span> : null}

      <EditClientDialog client={client} sellers={sellers} open={editOpen} onOpenChange={setEditOpen} />
      <MarkPaidDialog client={client} sellers={sellers} open={paidOpen} onOpenChange={setPaidOpen} />
      <BlockClientDialog client={client} open={blockOpen} onOpenChange={setBlockOpen} />
      <RoleChangeDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        userId={client.id}
        userName={client.name}
        currentRole={client.role || "STUDENT"}
      />
    </div>
  );
}

function EditClientDialog({
  client,
  sellers,
  open,
  onOpenChange
}: {
  client: ClientRow;
  sellers: SellerOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const defaultPaid = useMemo(
    () => (client.paidAmountCents / 100).toFixed(2).replace(".", ","),
    [client.paidAmountCents]
  );

  useEffect(() => {
    if (open) {
      setMessage(null);
      setDirty(false);
      setArchiveOpen(false);
    }
  }, [open, client.id]);

  function requestClose() {
    if (dirty && !window.confirm("Ha alteracoes nao salvas. Deseja sair sem salvar?")) return;
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>Editar cliente</DialogTitle>
        <form
          className="grid gap-4"
          onChange={() => setDirty(true)}
          action={(formData) => {
            setMessage(null);
            startTransition(async () => {
              const result = await updateClientProfile(formData);
              if (!result.ok) {
                setMessage(result.error);
                return;
              }
              setDirty(false);
              setMessage(result.message || "Salvo");
              onOpenChange(false);
            });
          }}
        >
          <input type="hidden" name="id" value={client.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className={labelClass()}>
              Nome
              <input name="name" defaultValue={client.name} required className={fieldClass()} />
            </label>
            <label className={labelClass()}>
              E-mail
              <input value={client.email} readOnly className={`${fieldClass()} opacity-70`} />
            </label>
            <label className={labelClass()}>
              Vendedor responsável
              <ThemeSelect
                name="sellerId"
                defaultValue={client.sellerId || ""}
                options={[{ value: "", label: "Sem vendedor" }, ...sellers.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </label>
            <label className={labelClass()}>
              Valor pago (R$)
              <input name="paidAmount" defaultValue={defaultPaid} className={fieldClass()} />
            </label>
            <label className={labelClass()}>
              Etapa comercial
              <ThemeSelect
                name="commercialStage"
                defaultValue={client.commercialStage}
                options={Object.entries(COMMERCIAL_STAGE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label className={labelClass()}>
              Status de acesso
              <ThemeSelect
                name="status"
                defaultValue={client.status}
                options={Object.entries(ACCESS_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label className={`${labelClass()} md:col-span-2`}>
              Observação administrativa
              <textarea name="adminNotes" defaultValue={client.adminNotes || ""} rows={3} className={`${fieldClass()} py-2`} />
            </label>
            <label className={labelClass()}>
              Motivo do bloqueio
              <input name="blockReason" defaultValue={client.blockReason || ""} className={fieldClass()} />
            </label>
            <div className="grid gap-1 text-xs text-white/50">
              <p>Cadastro: {new Date(client.createdAt).toLocaleString("pt-BR")}</p>
              <p>Última alteração: {new Date(client.updatedAt).toLocaleString("pt-BR")}</p>
              <p>Valor atual: {formatBRLFromCents(client.paidAmountCents)}</p>
            </div>
          </div>

          {message ? <p className="text-sm text-white/70">{message}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={requestClose}>
              Cancelar
            </Button>
          </div>
        </form>

        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-bold text-red-100">Zona de perigo</p>
          <p className="mt-1 text-xs text-red-100/75">
            Arquivar remove o cliente da listagem normal e preserva progresso, vendas e historico.
          </p>
          {!archiveOpen ? (
            <Button type="button" variant="destructive" size="sm" className="mt-3" onClick={() => setArchiveOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Excluir cliente
            </Button>
          ) : (
            <ArchiveClientForm client={client} onDone={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveClientForm({ client, onDone }: { client: ClientRow; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 grid gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await archiveClient(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onDone();
        });
      }}
    >
      <input type="hidden" name="id" value={client.id} />
      <p className="text-xs text-white/70">
        Digite <strong>{client.email}</strong> ou a palavra <strong>EXCLUIR</strong> para confirmar.
      </p>
      <input name="confirm" required className={fieldClass()} placeholder={client.email} autoComplete="off" />
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Confirmar exclusao
      </Button>
    </form>
  );
}

function MarkPaidDialog({
  client,
  sellers,
  open,
  onOpenChange
}: {
  client: ClientRow;
  sellers: SellerOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const defaultPaid = (client.paidAmountCents / 100 || 0).toFixed(2).replace(".", ",");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Marcar como pago</DialogTitle>
        <p className="text-sm text-white/60">
          Registra a venda, associa o vendedor e libera o acesso de <strong className="text-white">{client.name}</strong>.
        </p>
        <form
          className="grid gap-3"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await markClientAsPaid(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onOpenChange(false);
            });
          }}
        >
          <input type="hidden" name="clientId" value={client.id} />
          <label className={labelClass()}>
            Valor pago (R$)
            <input name="paidAmount" defaultValue={defaultPaid === "0,00" ? "" : defaultPaid} required className={fieldClass()} />
          </label>
          <label className={labelClass()}>
            Vendedor responsável
            <ThemeSelect
              name="sellerId"
              defaultValue={client.sellerId || ""}
              options={[{ value: "", label: "Sem vendedor" }, ...sellers.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </label>
          <label className={labelClass()}>
            Data da venda
            <input name="soldAt" type="date" defaultValue={today} className={fieldClass()} />
          </label>
          <label className={labelClass()}>
            Observacao (opcional)
            <textarea name="notes" rows={2} className={`${fieldClass()} py-2`} />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Confirmar pagamento
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BlockClientDialog({
  client,
  open,
  onOpenChange
}: {
  client: ClientRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Bloquear acesso</DialogTitle>
        <p className="text-sm text-white/60">O cliente perde o acesso a area de membros. Dados e progresso sao preservados.</p>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const reason = String(formData.get("reason") || "").trim();
            setError(null);
            startTransition(async () => {
              const result = await updateClientAccessStatus(client.id, "BLOCKED", reason || "Bloqueio administrativo");
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onOpenChange(false);
            });
          }}
        >
          <label className={labelClass()}>
            Motivo
            <input name="reason" defaultValue={client.blockReason || ""} className={fieldClass()} />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Confirmar bloqueio
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Legacy approvals UI still used on /admin/aprovacoes */
export function ClientActions({ client, mode = "clients" }: { client: ClientRow; sellers?: SellerOption[]; mode?: "approvals" | "clients" }) {
  const [pending, startTransition] = useTransition();

  if (mode === "clients") {
    return <ClientRowActions client={client} sellers={[]} />;
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="min-w-0">
        <p className="font-bold text-white">{client.name}</p>
        <p className="break-all text-sm text-white/55">{client.email}</p>
        <p className="mt-1 text-xs text-white/45">
          {ACCESS_STATUS_LABELS[client.status]} · {COMMERCIAL_STAGE_LABELS[client.commercialStage]} · {formatBRLFromCents(client.paidAmountCents)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "ACTIVE"))}>
          Aprovar acesso
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "CANCELLED"))}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
