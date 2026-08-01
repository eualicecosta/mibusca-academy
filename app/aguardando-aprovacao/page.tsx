import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Clock, PauseCircle, ShieldAlert, ShieldX } from "lucide-react";
import { homePathForProfile, requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ApprovalPage() {
  const profile = await requireProfile();
  if (profile.status === "ACTIVE") {
    redirect(homePathForProfile(profile));
  }

  const status = profile.status;
  const copy =
    status === "REFUSED"
      ? {
          icon: ShieldAlert,
          kicker: "Cadastro recusado",
          title: "Seu acesso não foi liberado",
          body: "Fale com a administração da MiBusca Brasil para revisar seu cadastro."
        }
      : status === "BLOCKED"
        ? {
            icon: ShieldX,
            kicker: "Acesso bloqueado",
            title: "Sua conta está bloqueada",
            body: "Entre em contato com a administração para entender o motivo e solicitar reativação."
          }
        : status === "PAUSED"
          ? {
              icon: PauseCircle,
              kicker: "Acesso pausado",
              title: "Seu acesso está temporariamente pausado",
              body: "Seu progresso e dados foram preservados. Quando o acesso for reativado, você volta a usar a plataforma."
            }
          : status === "CANCELLED"
            ? {
                icon: ShieldAlert,
                kicker: "Cadastro cancelado",
                title: "Este cadastro foi cancelado",
                body: "Se acredita que isso foi um engano, fale com a equipe MiBusca Brasil."
              }
            : {
                icon: Clock,
                kicker: "Aguardando aprovação",
                title: "Seu cadastro foi recebido",
                body: "Assim que a equipe aprovar seu acesso e definir sua função, a área correspondente será liberada automaticamente."
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
        <div className="mt-8">
          <SignOutButton>
            <Button variant="secondary">Sair da conta</Button>
          </SignOutButton>
        </div>
      </section>
    </main>
  );
}
