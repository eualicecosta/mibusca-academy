import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RolePreviewBanner } from "@/components/role-preview-banner";
import { SupportButton } from "@/components/support-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSeller } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/admin-labels";
import { buildWhatsAppUrl, getSupportSettings } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function SellerHomePage() {
  const profile = await requireSeller();
  const support = await getSupportSettings();
  const supportHref =
    support.supportEnabled && support.supportWhatsApp
      ? buildWhatsAppUrl(support.supportWhatsApp, support.supportDefaultMessage)
      : null;

  return (
    <AppShell
      variant="seller"
      showAdmin={profile.actualRole === "ADMIN"}
      isRolePreview={profile.isRolePreview}
      userName={profile.name}
      userEmail={profile.email}
      supportHref={supportHref}
      previewBanner={profile.isRolePreview ? <RolePreviewBanner asRole="SELLER" /> : null}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Área do vendedor</p>
          <h1 className="mt-2 break-words text-3xl font-bold sm:text-4xl">Olá, {profile.name}</h1>
          <p className="mt-3 text-white/62">
            Painel inicial do vendedor. Em breve você verá vendas e comissões aqui. Por enquanto, gerencie seu perfil e
            acompanhe o status da conta.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-white/70">
              <p>
                Função: <strong className="text-white">{ROLE_LABELS[profile.effectiveRole]}</strong>
              </p>
              <p>
                E-mail: <strong className="break-all text-white">{profile.email}</strong>
              </p>
              <p>
                Status: <strong className="text-white">Ativo</strong>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Próximos passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/70">
              <p>Espaço reservado para futuras vendas e comissões.</p>
              <Link href="/perfil" className="inline-flex font-bold text-[#B76CFF] underline-offset-4 hover:underline">
                Ir para meu perfil
              </Link>
              <div>
                <SupportButton settings={support} />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
      {!profile.isRolePreview ? <SupportButton variant="float" settings={support} /> : null}
    </AppShell>
  );
}
