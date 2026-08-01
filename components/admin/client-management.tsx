"use client";

import { useTransition } from "react";
import type { ApprovalStatus, CommercialStage } from "@prisma/client";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCESS_STATUS_LABELS, COMMERCIAL_STAGE_LABELS, formatBRLFromCents } from "@/lib/admin-labels";
import { updateClientAccessStatus, updateClientCommercialStage, updateClientProfile } from "@/lib/client-actions";

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  status: ApprovalStatus;
  commercialStage: CommercialStage;
  paidAmountCents: number;
  createdAt: string;
  approvedAt: string | null;
  adminNotes: string | null;
  blockReason: string | null;
};

export function ClientActions({ client, mode = "clients" }: { client: ClientRow; mode?: "approvals" | "clients" }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="min-w-0">
        <p className="font-bold text-white">{client.name}</p>
        <p className="break-all text-sm text-white/55">{client.email}</p>
        <p className="mt-1 text-xs text-white/45">
          {ACCESS_STATUS_LABELS[client.status]} · {COMMERCIAL_STAGE_LABELS[client.commercialStage]} ·{" "}
          {formatBRLFromCents(client.paidAmountCents)}
        </p>
      </div>

      <form
        className="grid gap-3 md:grid-cols-2"
        action={(formData) => {
          startTransition(() => {
            void updateClientProfile(formData);
          });
        }}
      >
        <input type="hidden" name="id" value={client.id} />
        <label className="grid gap-1 text-xs text-white/60">
          Nome
          <input name="name" defaultValue={client.name} className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white" />
        </label>
        <label className="grid gap-1 text-xs text-white/60">
          Valor pago (R$)
          <input
            name="paidAmount"
            defaultValue={(client.paidAmountCents / 100).toFixed(2).replace(".", ",")}
            className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white"
          />
        </label>
        <label className="grid gap-1 text-xs text-white/60">
          Etapa comercial
          <select name="commercialStage" defaultValue={client.commercialStage} className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white">
            {Object.entries(COMMERCIAL_STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-white/60">
          Status de acesso
          <select name="status" defaultValue={client.status} className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white">
            {Object.entries(ACCESS_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-white/60 md:col-span-2">
          Observacao administrativa
          <textarea name="adminNotes" defaultValue={client.adminNotes || ""} rows={2} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" />
        </label>
        <label className="grid gap-1 text-xs text-white/60 md:col-span-2">
          Motivo do bloqueio (se aplicar)
          <input name="blockReason" defaultValue={client.blockReason || ""} className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white" />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alteracoes
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {mode === "approvals" ? (
          <>
            <QuickStage clientId={client.id} stage="CONTACT_MADE" label="Contato realizado" pending={pending} startTransition={startTransition} />
            <QuickStage clientId={client.id} stage="AWAITING_PAYMENT" label="Aguardando pagamento" pending={pending} startTransition={startTransition} />
            <QuickStage clientId={client.id} stage="PAYMENT_CONFIRMED" label="Pagamento confirmado" pending={pending} startTransition={startTransition} />
            <QuickStage clientId={client.id} stage="AWAITING_REGISTRATION" label="Aguardando cadastro" pending={pending} startTransition={startTransition} />
            <QuickStage clientId={client.id} stage="AWAITING_APPROVAL" label="Aguardando aprovacao" pending={pending} startTransition={startTransition} />
            <Button
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "ACTIVE"))}
            >
              Aprovar acesso
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "CANCELLED"))}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "PAUSED"))}>
              Pausar
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "ACTIVE"))}>
              Reativar
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "CANCELLED"))}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Bloquear este cliente? O acesso ao curso sera impedido.")) {
                  startTransition(() => void updateClientAccessStatus(client.id, "BLOCKED", "Bloqueio administrativo"));
                }
              }}
            >
              Bloquear
            </Button>
            <Button size="sm" disabled={pending} onClick={() => startTransition(() => void updateClientAccessStatus(client.id, "ACTIVE"))}>
              Desbloquear
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function QuickStage({
  clientId,
  stage,
  label,
  pending,
  startTransition
}: {
  clientId: string;
  stage: CommercialStage;
  label: string;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => void updateClientCommercialStage(clientId, stage))}
    >
      {label}
    </Button>
  );
}
