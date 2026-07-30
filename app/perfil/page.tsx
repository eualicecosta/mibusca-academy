import { UserProfile } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();
  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
      <div className="mx-auto grid min-w-0 max-w-6xl gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Informações do perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[#53009F] text-4xl font-bold">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-3 rounded-lg bg-white/[0.04] p-4 text-sm">
              <p className="grid gap-1 sm:grid-cols-[90px_minmax(0,1fr)]"><span className="text-white/55">Nome</span><strong className="min-w-0 break-words sm:text-right">{profile.name}</strong></p>
              <p className="grid gap-1 sm:grid-cols-[90px_minmax(0,1fr)]"><span className="text-white/55">E-mail</span><strong className="min-w-0 break-all sm:text-right">{profile.email}</strong></p>
              <p className="grid gap-1 sm:grid-cols-[90px_minmax(0,1fr)]"><span className="text-white/55">Status</span><strong className="min-w-0 break-words sm:text-right">{profile.status}</strong></p>
              <p className="grid gap-1 sm:grid-cols-[90px_minmax(0,1fr)]"><span className="text-white/55">Cadastro</span><strong className="min-w-0 break-words sm:text-right">{profile.createdAt.toLocaleDateString("pt-BR")}</strong></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conta e senha</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <UserProfile routing="hash" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
