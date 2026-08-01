"use client";

import { useState, useTransition } from "react";
import type { ApprovalStatus, CommercialStage, UserRole } from "@prisma/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ThemeSelect } from "@/components/ui/theme-select";
import { ACCESS_STATUS_LABELS, COMMERCIAL_STAGE_LABELS, ROLE_LABELS } from "@/lib/admin-labels";
import { approveUserWithRole, refuseUser } from "@/lib/role-actions";

export type ApprovalItem = {
  id: string;
  name: string;
  email: string;
  status: ApprovalStatus;
  commercialStage: CommercialStage;
  role: UserRole;
  createdAt: string;
};

export function ApprovalQueue({ items }: { items: ApprovalItem[] }) {
  if (!items.length) {
    return (
      <Card>
        <CardContent className="p-6 text-white/65">Nenhum cadastro aguardando aprovação no momento.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ApprovalCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ApprovalCard({ item }: { item: ApprovalItem }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmLabel =
    role === "ADMIN" ? "Aprovar como administrador" : role === "SELLER" ? "Aprovar como vendedor" : "Aprovar como cliente";

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-lg font-bold text-white">{item.name}</p>
          <p className="break-all text-sm text-white/55">{item.email}</p>
          <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-white/45">
            <span>Cadastro: {new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
            <span>·</span>
            <span>{ACCESS_STATUS_LABELS[item.status]}</span>
            <span>·</span>
            <span>{COMMERCIAL_STAGE_LABELS[item.commercialStage]}</span>
            <span>·</span>
            <span>{ROLE_LABELS[item.role]}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => setOpen(true)}>
            <CheckCircle2 className="h-4 w-4" />
            Aprovar
          </Button>
          {item.status === "PENDING" ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Recusar este cadastro?")) return;
                startTransition(async () => {
                  const result = await refuseUser(item.id);
                  setMessage(result.ok ? result.message || "Recusado" : null);
                  setError(result.ok ? null : result.error);
                });
              }}
            >
              <XCircle className="h-4 w-4" />
              Recusar
            </Button>
          ) : null}
        </div>
      </div>
      {message ? <p className="mt-2 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-200">{error}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Aprovar cadastro</DialogTitle>
          <div className="space-y-2 text-sm text-white/70">
            <p>
              <strong className="text-white">{item.name}</strong>
            </p>
            <p className="break-all">{item.email}</p>
            <p>Cadastro: {new Date(item.createdAt).toLocaleString("pt-BR")}</p>
            <p>Status atual: {ACCESS_STATUS_LABELS[item.status]}</p>
            <p>Etapa comercial: {COMMERCIAL_STAGE_LABELS[item.commercialStage]}</p>
          </div>
          <form
            className="grid gap-3"
            action={(formData) => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const result = await approveUserWithRole(formData);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setMessage(result.message || "Aprovado");
                setOpen(false);
              });
            }}
          >
            <input type="hidden" name="userId" value={item.id} />
            <label className="grid gap-1 text-xs font-semibold text-white/60">
              Função (obrigatória)
              <ThemeSelect
                name="role"
                value={role}
                onChange={(v) => setRole(v as UserRole)}
                required
                options={[
                  { value: "STUDENT", label: "Cliente" },
                  { value: "SELLER", label: "Vendedor" },
                  { value: "ADMIN", label: "Administrador" }
                ]}
              />
            </label>
            {error ? <p className="text-sm text-red-200">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {confirmLabel}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}
