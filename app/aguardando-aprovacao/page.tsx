import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Clock, PauseCircle, ShieldAlert, ShieldX } from "lucide-react";
import { SupportButton } from "@/components/support-button";
import { homePathForProfile, requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getSupportSettings } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function ApprovalPage() {
  const profile = await requireProfile();
  if (profile.status === "ACTIVE") {
    redirect(homePathForProfile(profile));
  }

  const support = await getSupportSettings();
  const status = profile.status;

  const copy =
    status === "REFUSED"
      ? {
          icon: ShieldAlert,
          kicker: "Cadastro recusado",
          title: "Seu cadastro não foi aprovado",
          body: "Seu cadastro não foi aprovado neste momento. Entre em contato com o suporte caso precise de mais informações.",
          statusKey: "REFUSED"
        }
      : status === "BLOCKED"
        ? {
            icon: ShieldX,
            kicker: "Acesso bloqueado",
            title: "Seu acesso está bloqueado",
            body: "Não foi possível liberar o acesso à plataforma. Entre em contato com o suporte para obter mais informações.",
            statusKey: "BLOCKED"
          }
        : status === "PAUSED"
          ? {
              icon: PauseCircle,
              kicker: "Acesso pausado",
              title: "Seu acesso está temporariamente pausado",
              body: "Seu progresso e seus dados continuam preservados. Entre em contato com o suporte para verificar a situação do seu acesso.",
              statusKey: "PAUSED"
            }
          : status === "CANCELLED"
            ? {
                icon: ShieldAlert,
                kicker: "Acesso cancelado",
                title: "Seu acesso foi cancelado",
                body: "Seu acesso à plataforma não está mais ativo. Entre em contato com o suporte caso precise de atendimento.",
                statusKey: "CANCELLED"
              }
            : {
                icon: Clock,
                kicker: "Aguardando aprovação",
                title: "Seu cadastro está em análise",
                body: "Recebemos seu cadastro e ele está aguardando a aprovação da nossa equipe. Você será avisado assim que o acesso for liberado.",
                statusKey: "PENDING"
              };

  const Icon = copy.icon;

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-10">
      <section className="w-full max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-[#151019] p-5 text-center sm:max-w-xl sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#8A1DEE]/15 text-[#8A1DEE]">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">{copy.kicker}</p>
        <h1 className="mt-3 break-words text-3xl font-bold text-[#F5F3F3]">{copy.title}</h1>
        <p className="mt-4 break-words leading-7 text-[#F5F3F3]/68">{copy.body}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SupportButton variant="primary" statusKey={copy.statusKey} settings={support} />
          <SignOutButton>
            <Button variant="secondary">Sair da conta</Button>
          </SignOutButton>
        </div>
      </section>
    </main>
  );
}
