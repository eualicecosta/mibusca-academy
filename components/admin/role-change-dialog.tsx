"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@prisma/client";
import { Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ThemeSelect } from "@/components/ui/theme-select";
import { ROLE_LABELS } from "@/lib/admin-labels";
import { updateUserRole } from "@/lib/role-actions";

export function RoleChangeDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: UserRole;
}) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRole(currentRole);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle>Alterar função</DialogTitle>
        <p className="text-sm text-white/65">
          <strong className="text-white">{userName}</strong> é atualmente{" "}
          <strong className="text-white">{ROLE_LABELS[currentRole]}</strong>. A mudança redefine o acesso ao painel e à
          área de membros.
        </p>
        <form
          className="grid gap-3"
          action={(formData) => {
            setError(null);
            if (role !== currentRole && currentRole === "ADMIN" && role !== "ADMIN") {
              if (!window.confirm("Confirmar rebaixamento deste administrador?")) return;
            }
            startTransition(async () => {
              const result = await updateUserRole(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onOpenChange(false);
            });
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Nova função
            <ThemeSelect
              name="role"
              value={role}
              onChange={(v) => setRole(v as UserRole)}
              options={[
                { value: "STUDENT", label: "Cliente" },
                { value: "SELLER", label: "Vendedor" },
                { value: "ADMIN", label: "Administrador" }
              ]}
            />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || role === currentRole}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
              Confirmar
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
