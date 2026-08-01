import { AppShell } from "@/components/app-shell";
import { AccountSettings } from "@/components/profile/account-settings";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <AppShell showAdmin={profile.role === "ADMIN"} userName={profile.name} userEmail={profile.email}>
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
            role: profile.role,
            status: profile.status,
            createdAt: profile.createdAt.toISOString(),
            imageUrl: profile.imageUrl
          }}
        />
      </div>
    </AppShell>
  );
}
