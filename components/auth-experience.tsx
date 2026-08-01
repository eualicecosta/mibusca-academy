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
    <main className="auth-shell relative text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-[var(--primary)]/12 blur-3xl" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl lg:min-h-[100svh] lg:grid-cols-2">
        <aside className="hidden min-h-0 flex-col justify-center border-r border-[var(--border)] px-8 py-8 lg:flex xl:px-12 xl:py-10">
          <div className="mx-auto w-full max-w-lg">
            <h1 className="animate-fade-up max-w-lg text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Treinamento fechado para operar o iFood com criterio.
            </h1>
            <p className="animate-fade-up-delay-1 mt-3 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)] xl:text-base">
              Domine funil, precificacao, cardapio, campanhas e rotina de crescimento com uma plataforma pensada para o dia a dia do aluno.
            </p>

            <div className="mt-6 space-y-2.5">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 ${
                      index === 0 ? "animate-fade-up-delay-1" : index === 1 ? "animate-fade-up-delay-2" : "animate-fade-up-delay-3"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/25 text-[var(--secondary)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)] xl:text-sm">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--secondary)]" />
              <span>Acesso seguro, progresso salvo e experiencia focada no aprendizado.</span>
            </div>
          </div>
        </aside>

        <section className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {/* Single bordered surface; height grows with Clerk steps (password, MFA, errors). */}
          <div className="auth-panel animate-fade-up mx-auto w-full max-w-[420px] overflow-visible p-5 sm:p-7">
            <div className="mb-5 lg:hidden">
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

            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
              {isSignIn ? "Entrar" : "Solicitar acesso"}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)]">
              {isSignIn
                ? "Acesse sua area de membros com o e-mail cadastrado."
                : "Crie sua conta e aguarde a aprovacao manual da equipe."}
            </p>

            <div className="auth-clerk mt-5 w-full min-w-0">{children}</div>

            <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
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
    rootBox: "auth-clerk-root w-full max-w-full",
    cardBox: "auth-clerk-card-box w-full max-w-full shadow-none !bg-transparent",
    card: "auth-clerk-card w-full max-w-full !bg-transparent !shadow-none !border-0 !p-0",
    main: "w-full gap-3",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1] min-h-10 w-full",
    socialButtonsBlockButtonText: "text-white font-semibold",
    dividerLine: "bg-white/15",
    dividerText: "text-white/55",
    formFieldLabel: "text-white/75 font-medium",
    formFieldInput:
      "bg-white/[0.06] border border-white/15 text-white placeholder:text-white/35 min-h-10 focus:border-[#8A1DEE] focus:ring-2 focus:ring-[#8A1DEE]/30",
    formButtonPrimary:
      "bg-[#53009F] hover:bg-[#8A1DEE] text-white font-semibold min-h-10 shadow-lg shadow-[#53009F]/25 w-full",
    footer: "auth-clerk-footer w-full relative !static mt-3",
    footerAction: "w-full",
    footerActionLink: "text-[#B76CFF] hover:text-white",
    footerPages: "w-full",
    identityPreviewEditButton: "text-[#B76CFF]",
    formFieldSuccessText: "text-emerald-300",
    formFieldErrorText: "text-red-300",
    alertText: "text-white/80"
  }
} as const;
