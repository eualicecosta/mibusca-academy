import Link from "next/link";
import { BookOpenCheck, LockKeyhole, Sparkles, TrendingUp } from "lucide-react";

const highlights = [
  {
    icon: LockKeyhole,
    title: "Acesso por aprovacao",
    text: "Conteudo liberado somente para alunos validados pela MiBusca Brasil."
  },
  {
    icon: BookOpenCheck,
    title: "Trilha pratica",
    text: "Modulos e checklists para aplicar funil, cardapio, campanhas e ROI."
  },
  {
    icon: TrendingUp,
    title: "Progresso real",
    text: "Continue de onde parou e acompanhe o avanco de cada aula."
  }
];

export function AuthExperience({
  mode,
  children
}: {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
}) {
  const isSignIn = mode === "sign-in";

  return (
    <main className="auth-shell relative overflow-x-hidden text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[var(--primary)]/15 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-7xl lg:grid-cols-2">
        <aside className="hidden flex-col justify-between border-r border-[var(--border)] px-10 py-12 lg:flex xl:px-14">
          <div>
            <div className="animate-fade-up flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/12 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold shadow-lg shadow-[var(--primary)]/25">
                M
              </span>
              <div>
                <p className="text-base font-bold">MiBusca Academy</p>
                <p className="text-sm text-[var(--muted-foreground)]">Conhecimento iFood</p>
              </div>
            </div>

            <h1 className="animate-fade-up-delay-1 mt-12 max-w-lg text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Treinamento fechado para operar o iFood com criterio.
            </h1>
            <p className="animate-fade-up-delay-2 mt-5 max-w-md text-base leading-relaxed text-[var(--muted-foreground)]">
              Domine funil, precificacao, cardapio, campanhas e rotina de crescimento com uma plataforma pensada para o dia a dia do aluno.
            </p>

            <div className="mt-10 space-y-3">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm ${
                      index === 0 ? "animate-fade-up-delay-1" : index === 1 ? "animate-fade-up-delay-2" : "animate-fade-up-delay-3"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/25 text-[var(--secondary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Sparkles className="h-4 w-4 text-[var(--secondary)]" />
            <span>Acesso seguro, progresso salvo e experiencia focada no aprendizado.</span>
          </div>
        </aside>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="auth-panel animate-fade-up w-full max-w-[440px] p-5 sm:p-8">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-sm font-bold">
                  M
                </span>
                <div>
                  <p className="text-sm font-bold">MiBusca Academy</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Conhecimento iFood</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{isSignIn ? "Entrar" : "Solicitar acesso"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {isSignIn
                ? "Acesse sua area de membros com o e-mail cadastrado."
                : "Crie sua conta e aguarde a aprovacao manual da equipe."}
            </p>

            <div className="mt-6">{children}</div>

            <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              {isSignIn ? (
                <>
                  Ainda nao tem acesso?{" "}
                  <Link href="/sign-up" className="font-semibold text-[var(--secondary)] underline-offset-4 hover:underline">
                    Solicitar cadastro
                  </Link>
                </>
              ) : (
                <>
                  Ja tem conta?{" "}
                  <Link href="/sign-in" className="font-semibold text-[var(--secondary)] underline-offset-4 hover:underline">
                    Entrar
                  </Link>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#8A1DEE",
    colorBackground: "transparent",
    colorText: "#F5F3F3",
    colorTextSecondary: "#B7AEC4",
    colorInputBackground: "rgba(255,255,255,0.06)",
    colorInputText: "#F5F3F3",
    colorNeutral: "#F5F3F3",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif"
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-full shadow-none",
    card: "bg-transparent shadow-none border-0 p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1] min-h-11",
    socialButtonsBlockButtonText: "text-white font-semibold",
    dividerLine: "bg-white/15",
    dividerText: "text-white/55",
    formFieldLabel: "text-white/75 font-medium",
    formFieldInput:
      "bg-white/[0.06] border border-white/15 text-white placeholder:text-white/35 min-h-11 focus:border-[#8A1DEE] focus:ring-2 focus:ring-[#8A1DEE]/30",
    formButtonPrimary:
      "bg-[#53009F] hover:bg-[#8A1DEE] text-white font-semibold min-h-11 shadow-lg shadow-[#53009F]/25",
    footerActionLink: "text-[#B76CFF] hover:text-white",
    identityPreviewEditButton: "text-[#B76CFF]",
    formFieldSuccessText: "text-emerald-300",
    formFieldErrorText: "text-red-300",
    alertText: "text-white/80"
  }
} as const;
