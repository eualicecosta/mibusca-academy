import { AppShell } from "@/components/app-shell";
import { RolePreviewBanner } from "@/components/role-preview-banner";
import { AccountSettings } from "@/components/profile/account-settings";
import { SupportButton } from "@/components/support-button";
import { requireSessionProfile } from "@/lib/auth";
import { buildWhatsAppUrl, getSupportSettings } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireSessionProfile();
  const support = await getSupportSettings();
  const supportHref =
    support.supportEnabled && support.supportWhatsApp
      ? buildWhatsAppUrl(support.supportWhatsApp, support.supportDefaultMessage)
      : null;

  return (
    <AppShell
      showAdmin={profile.actualRole === "ADMIN"}
      isRolePreview={profile.isRolePreview}
      userName={profile.name}
      userEmail={profile.email}
      supportHref={supportHref}
      previewBanner={
        profile.isRolePreview ? (
          <RolePreviewBanner asRole={profile.effectiveRole === "SELLER" ? "SELLER" : "STUDENT"} />
        ) : null
      }
    >
      <div className="mx-auto min-w-0 max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Conta</p>
          <h1 className="mt-2 text-4xl font-bold">Meu perfil</h1>
          <p className="mt-3 text-white/62">Gerencie nome, foto e senha com o visual do MiBusca. A identidade continua na Clerk.</p>
        </header>
        <AccountSettings
          profile={{
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.effectiveRole,
            status: profile.status,
            createdAt: profile.createdAt.toISOString(),
            imageUrl: profile.imageUrl
          }}
        />
        <SupportButton settings={support} />
      </div>
    </AppShell>
  );
}
