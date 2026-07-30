import { SignOutButton } from "@clerk/nextjs";
import { Clock, ShieldAlert } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ApprovalPage() {
  const profile = await requireProfile();
  const refused = profile.status === "REFUSED";

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden px-4">
      <section className="w-full max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-[#151019] p-5 text-center sm:max-w-xl sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#8A1DEE]/15 text-[#8A1DEE]">
          {refused ? <ShieldAlert className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">
          {refused ? "Cadastro recusado" : "Aguardando aprovação"}
        </p>
        <h1 className="mt-3 break-words text-3xl font-bold text-[#F5F3F3]">
          {refused ? "Seu acesso não foi liberado" : "Seu cadastro foi recebido"}
        </h1>
        <p className="mt-4 break-words leading-7 text-[#F5F3F3]/68">
          {refused
            ? "Fale com a administração da MiBusca Brasil para revisar seu cadastro."
            : "Assim que a compra for confirmada, o admin muda seu status para ativo e o curso aparece automaticamente."}
        </p>
        <div className="mt-8">
          <SignOutButton>
            <Button variant="secondary">Sair</Button>
          </SignOutButton>
        </div>
      </section>
    </main>
  );
}
