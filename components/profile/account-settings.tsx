"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { Camera, KeyRound, Loader2, Save, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ACCESS_STATUS_LABELS, ROLE_LABELS } from "@/lib/admin-labels";
import { syncOwnImageUrl, updateOwnName } from "@/lib/profile-actions";
import type { ApprovalStatus, UserRole } from "@prisma/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function AccountSettings({
  profile
}: {
  profile: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: ApprovalStatus;
    createdAt: string;
    imageUrl: string | null;
  };
}) {
  const { user, isLoaded } = useUser();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const avatarUrl = preview || user?.imageUrl || profile.imageUrl || null;
  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/);
    return `${parts[0]?.[0] || "U"}${parts[1]?.[0] || ""}`.toUpperCase();
  }, [profile.name]);

  const hasPassword = Boolean(user?.passwordEnabled);
  const hasGoogle = Boolean(user?.externalAccounts?.some((a) => a.provider === "google"));

  async function onPickImage(file: File | null) {
    setError(null);
    setMessage(null);
    if (!file || !user) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Use PNG, JPG, WEBP ou GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("A imagem deve ter no maximo 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      await user.setProfileImage({ file });
      await user.reload();
      const nextUrl = user.imageUrl || null;
      startTransition(async () => {
        const result = await syncOwnImageUrl(nextUrl);
        if (!result.ok) setError(result.error);
        else setMessage("Foto atualizada.");
      });
    } catch {
      setError("Nao foi possivel atualizar a foto na Clerk.");
      setPreview(null);
    }
  }

  return (
    <div className="mx-auto grid min-w-0 max-w-5xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-[#151019] p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-[#53009F] to-[#8A1DEE]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="112px" className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold">{initials}</div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onPickImage(e.target.files?.[0] || null)}
          />
          <Button type="button" size="sm" variant="secondary" disabled={!isLoaded || pending} onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" />
            Alterar foto
          </Button>
          <p className="mt-4 text-lg font-bold text-white">{profile.name}</p>
          <p className="break-all text-sm text-white/55">{profile.email}</p>
          <div className="mt-4 grid w-full gap-2 rounded-xl bg-white/[0.04] p-3 text-left text-sm">
            <p className="flex justify-between gap-2">
              <span className="text-white/50">Funcao</span>
              <strong>{ROLE_LABELS[profile.role]}</strong>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-white/50">Status</span>
              <strong>{ACCESS_STATUS_LABELS[profile.status]}</strong>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-white/50">Cadastro</span>
              <strong>{new Date(profile.createdAt).toLocaleDateString("pt-BR")}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#151019] p-6 shadow-xl">
          <h2 className="text-xl font-bold">Editar nome</h2>
          <p className="mt-1 text-sm text-white/55">Atualiza o nome no MiBusca e na Clerk.</p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
            action={(formData) => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const result = await updateOwnName(formData);
                if (!result.ok) setError(result.error);
                else {
                  setMessage(result.message || "Salvo");
                  await user?.reload();
                }
              });
            }}
          >
            <input
              name="name"
              defaultValue={profile.name}
              required
              className="min-h-11 rounded-lg border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-[#8A1DEE]"
            />
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151019] p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Seguranca da conta</h2>
              <p className="mt-1 text-sm text-white/55">Identidade gerenciada pela Clerk. Senhas nunca sao salvas no banco MiBusca.</p>
            </div>
            <Shield className="h-5 w-5 text-[#8A1DEE]" />
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/70">
            <p>
              Login Google: <strong className="text-white">{hasGoogle ? "conectado" : "nao vinculado"}</strong>
            </p>
            <p>
              Senha da conta: <strong className="text-white">{hasPassword ? "configurada" : "nao configurada"}</strong>
            </p>
          </div>

          {hasPassword || !hasGoogle ? (
            <Button type="button" className="mt-4" variant="secondary" onClick={() => setPasswordOpen(true)} disabled={!isLoaded}>
              <KeyRound className="h-4 w-4" />
              {hasPassword ? "Trocar senha" : "Criar senha"}
            </Button>
          ) : (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
              Esta conta entra com Google e nao possui senha local. Voce pode continuar usando o Google sem desconectar.
              {user ? (
                <Button type="button" className="mt-3" size="sm" variant="secondary" onClick={() => setPasswordOpen(true)}>
                  <KeyRound className="h-4 w-4" />
                  Adicionar senha (opcional)
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {message ? <p className="text-sm text-emerald-200/90">{message}</p> : null}
        {error ? <p className="text-sm text-red-200">{error}</p> : null}
      </section>

      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} hasPassword={hasPassword} />
    </div>
  );
}

function PasswordDialog({
  open,
  onOpenChange,
  hasPassword
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasPassword: boolean;
}) {
  const { user } = useUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmacao nao confere com a nova senha.");
      return;
    }

    setPending(true);
    try {
      if (hasPassword) {
        await user.updatePassword({ currentPassword, newPassword });
      } else {
        // Clerk: create password for OAuth-only accounts when supported.
        await user.updatePassword({ newPassword });
      }
      setSuccess("Senha atualizada com sucesso.");
      event.currentTarget.reset();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "errors" in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).errors?.[0]?.longMessage || (err as any).errors?.[0]?.message
          : null;
      setError(msg || "Nao foi possivel atualizar a senha. Verifique os dados e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{hasPassword ? "Trocar senha" : "Criar senha"}</DialogTitle>
        <p className="text-sm text-white/60">A senha e validada pela Clerk. Nada e gravado no banco do MiBusca.</p>
        <form className="grid gap-3" onSubmit={(e) => void onSubmit(e)}>
          {hasPassword ? (
            <label className="grid gap-1 text-xs font-semibold text-white/60">
              Senha atual
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white"
              />
            </label>
          ) : null}
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Nova senha
            <input
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
              className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-white/60">
            Confirmar nova senha
            <input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white"
            />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-200">{success}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Salvar senha
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
