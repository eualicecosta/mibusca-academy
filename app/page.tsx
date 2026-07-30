import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden px-4">
      <section className="w-full max-w-[21rem] rounded-lg border border-white/10 bg-[#151019] p-5 shadow-2xl sm:max-w-[calc(100vw-2rem)] sm:p-8 md:max-w-5xl md:p-12">
        <div className="grid min-w-0 gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] md:items-center">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#8A1DEE]/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F5F3F3]/75">
              <LockKeyhole className="h-4 w-4 text-[#8A1DEE]" />
              Acesso fechado por aprovação
            </div>
            <h1 className="max-w-full break-words text-3xl font-bold leading-tight text-[#F5F3F3] sm:text-5xl md:text-7xl">Conhecimento iFood</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#F5F3F3]/70">
              Plataforma de ensino da MiBusca Brasil para operar, diagnosticar e melhorar resultados dentro do iFood.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#53009F] px-5 font-bold hover:bg-[#8A1DEE]" href="/dashboard">
                Entrar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-12 items-center rounded-lg border border-white/10 px-5 font-bold text-white/75 hover:bg-white/8" href="/sign-up">
                Solicitar cadastro
              </Link>
            </div>
          </div>
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/25 p-5 sm:p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Regra central</p>
            <p className="mt-4 break-words text-lg leading-8 text-[#F5F3F3]/78">
              O Clerk confirma quem é o aluno. O banco da MiBusca decide se esse aluno está aprovado. Sem status ativo, o curso continua bloqueado.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
