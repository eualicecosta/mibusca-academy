import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  LineChart,
  MessageCircle,
  Sparkles,
  Target,
  UtensilsCrossed
} from "lucide-react";
import {
  AnimatedCount,
  BeforeAfterCompare,
  CtaRow,
  FadeIn,
  SalesFaq,
  ScrollHeroVisual
} from "@/components/landing/sales-visuals";
import { SupportButton } from "@/components/support-button";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppUrl, getSupportSettings } from "@/lib/support";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MiBusca Academy | Treinamento prático de gestão no iFood",
  description:
    "Organize cardápio, precificação, campanhas e análise de funil com uma trilha prática para gestores de delivery no iFood.",
  openGraph: {
    title: "MiBusca Academy | Gestão prática no iFood",
    description:
      "Pare de administrar o iFood no improviso. Treinamento com trilha, checklists e rotina de análise para delivery.",
    type: "website",
    locale: "pt_BR"
  }
};

const getLandingStats = unstable_cache(
  async () => {
    try {
      const course = await prisma.course.findFirst({
        where: { slug: "conhecimento-ifood" },
        select: {
          title: true,
          categorias: {
            where: { status: "PUBLISHED" },
            select: {
              modules: {
                where: { status: "PUBLISHED" },
                select: {
                  id: true,
                  lessons: { where: { status: "PUBLISHED" }, select: { id: true } }
                }
              }
            }
          }
        }
      });
      if (!course) return { moduleCount: 0, lessonCount: 0 };
      const modules = course.categorias.flatMap((c) => c.modules);
      return {
        moduleCount: modules.length,
        lessonCount: modules.reduce((sum, m) => sum + m.lessons.length, 0)
      };
    } catch {
      return { moduleCount: 0, lessonCount: 0 };
    }
  },
  ["landing-public-stats-v1"],
  { revalidate: 120, tags: ["course-structure"] }
);

export default async function HomePage() {
  const [stats, support] = await Promise.all([getLandingStats(), getSupportSettings()]);
  const expertMessage =
    "Olá! Quero conhecer o treinamento MiBusca Academy e falar com a especialista sobre gestão no iFood.";
  const expertHref =
    support.supportEnabled && support.supportWhatsApp
      ? buildWhatsAppUrl(support.supportWhatsApp, expertMessage)
      : null;

  const year = new Date().getFullYear();
  const modulesLabel = stats.moduleCount || 10;
  const lessonsLabel = stats.lessonCount || 29;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07040c] text-[#F5F3F3]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07040c]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-[#111017] text-sm font-bold">
              M
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold sm:text-base">MiBusca Academy</span>
              <span className="hidden text-xs text-white/55 sm:block">Gestão prática no iFood</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-white/65 md:flex">
            <a href="#metodo" className="hover:text-white">
              Método
            </a>
            <a href="#oferta" className="hover:text-white">
              Oferta
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden rounded-lg border border-white/12 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 sm:inline-flex"
            >
              Já tenho login
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-[#53009F] px-3 py-2.5 text-sm font-bold transition hover:bg-[#8A1DEE] sm:px-4"
            >
              Quero acessar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(138,29,238,.38),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(83,0,159,.28),transparent_38%),linear-gradient(165deg,#07040c,#11081b_45%,#07040c)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:items-center lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#8A1DEE]/40 bg-black/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-[#8A1DEE]" />
              Treinamento para operação no iFood
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Pare de administrar o iFood no improviso.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              Aprenda a organizar cardápio, calcular preços, estruturar campanhas e analisar o funil com uma rotina
              prática de gestão para delivery.
            </p>
            <div className="mt-8">
              <CtaRow
                primaryHref="/sign-up"
                primaryLabel="Quero acessar o treinamento"
                secondaryHref={expertHref}
                secondaryLabel="Falar com um especialista"
                secondaryExternal
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/60">
              <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <strong className="text-white">
                  <AnimatedCount value={modulesLabel} />
                </strong>{" "}
                módulos
              </span>
              <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <strong className="text-white">
                  <AnimatedCount value={lessonsLabel} />
                </strong>{" "}
                aulas
              </span>
              <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">Checklists e progresso</span>
            </div>
          </div>
          <ScrollHeroVisual />
        </div>
      </section>

      {/* SEÇÃO 1 — prova de método */}
      <section id="metodo" className="border-y border-white/8 bg-[#0b0711]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <FadeIn>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              Você não precisa de mais uma aula genérica sobre iFood.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
              O conteúdo conecta decisões reais de loja: o que olhar antes de mudar preço, abrir campanha ou redesenhar
              o cardápio.
            </p>
          </FadeIn>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Target, t: "Diagnóstico antes da ação", d: "Identifique onde a operação perde conversão ou margem." },
              { icon: UtensilsCrossed, t: "Cardápio com intenção", d: "Estruture itens e combos para facilitar a escolha." },
              { icon: LineChart, t: "Números que orientam", d: "Leia funil, ticket e resultado de campanha com método." },
              { icon: ClipboardList, t: "Rotina aplicável", d: "Aulas com checklist para executar e acompanhar." }
            ].map((item) => (
              <FadeIn key={item.t} className="rounded-2xl border border-white/10 bg-[#151019] p-5">
                <item.icon className="h-6 w-6 text-[#8A1DEE]" />
                <h3 className="mt-4 text-lg font-bold text-white">{item.t}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{item.d}</p>
              </FadeIn>
            ))}
          </div>
          <div className="mt-8">
            {expertHref ? (
              <a
                href={expertHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#25D366]/35 bg-[#25D366]/12 px-4 text-sm font-bold text-[#7CFFB2] transition hover:bg-[#25D366]/2"
              >
                <MessageCircle className="h-4 w-4" />
                Conversar com o especialista
              </a>
            ) : (
              <SupportButton settings={support} label="Conversar com o especialista" />
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — antes/depois */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <FadeIn>
          <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            Você não precisa trabalhar mais. Precisa parar de decidir sem método.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
            Compare o modo improviso com a rotina organizada de cardápio, preço, campanha e análise.
          </p>
        </FadeIn>
        <div className="mt-8">
          <BeforeAfterCompare />
        </div>
      </section>

      {/* SEÇÃO 3 — o que recebe */}
      <section className="border-y border-white/8 bg-[#0b0711]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <FadeIn>
            <h2 className="max-w-3xl text-3xl font-bold text-white sm:text-4xl">
              Uma operação completa de iFood organizada em uma trilha prática.
            </h2>
          </FadeIn>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Trilha organizada por categorias e módulos",
              "Aulas práticas de cardápio e precificação",
              "Campanhas com lógica de objetivo e margem",
              "Funil, conversão, ticket e ROI",
              "Checklists de aplicação por aula",
              "Progresso salvo na área de membros",
              "Rotina de gestão para delivery",
              "Exemplos aplicados à operação real",
              "Acompanhamento do que já foi concluído"
            ].map((text) => (
              <FadeIn key={text} className="flex gap-3 rounded-xl border border-white/10 bg-[#151019] p-4 text-sm leading-6 text-white/75">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8A1DEE]" />
                {text}
              </FadeIn>
            ))}
          </div>
          <div className="mt-8">
            <CtaRow primaryHref="#oferta" primaryLabel="Ver o que vou receber" secondaryHref="/sign-up" secondaryLabel="Quero acessar o treinamento" />
          </div>
        </div>
      </section>

      {/* SEÇÃO 4 — diferenciais humanos */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <FadeIn>
          <h2 className="max-w-3xl text-3xl font-bold text-white sm:text-4xl">
            Você não vai aprender com alguém que conhece delivery apenas pela tela.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
            A trilha foi construída com experiência prática em operação e gestão para delivery.
          </p>
        </FadeIn>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { t: "Suporte humanizado", d: "Atendimento todos os dias da semana para acompanhar dúvidas e acesso." },
            { t: "Especialista em cardápio", d: "Conteúdo focado em estruturar o cardápio para facilitar a compra." },
            { t: "Experiência de operação", d: "Mais de 5 anos em gestão para delivery e 11 anos com hamburgueria." }
          ].map((item) => (
            <FadeIn key={item.t} className="rounded-2xl border border-white/10 bg-[#151019] p-6">
              <h3 className="text-xl font-bold text-white">{item.t}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{item.d}</p>
            </FadeIn>
          ))}
        </div>
        <div className="mt-8">
          {expertHref ? (
            <a
              href={expertHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#25D366] px-5 text-sm font-bold text-[#052e16] transition hover:brightness-110"
            >
              <MessageCircle className="h-4 w-4" />
              Quero falar com a especialista
            </a>
          ) : null}
        </div>
      </section>

      {/* SEÇÃO 5 — oferta */}
      <section id="oferta" className="border-y border-white/8 bg-[#0b0711]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <FadeIn className="overflow-hidden rounded-3xl border border-[#8A1DEE]/35 bg-gradient-to-br from-[#151019] to-[#1a0f27] p-6 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-wide text-[#B76CFF]">Condição por tempo limitado</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Acesso ao treinamento MiBusca Academy</h2>
            <div className="mt-6 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-sm text-white/50 line-through">De R$&nbsp;497,98</p>
                <p className="text-4xl font-bold text-white sm:text-5xl">
                  Por R$&nbsp;157,98
                </p>
              </div>
              <p className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-200">
                Economia de R$&nbsp;340,00
              </p>
            </div>
            <ul className="mt-8 grid gap-2 sm:grid-cols-2">
              {[
                "Acesso ao treinamento completo",
                "Módulos e aulas práticas",
                "Checklists de aplicação",
                "Progresso salvo na plataforma",
                "Suporte humanizado",
                "Área de membros organizada"
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-white/75">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8A1DEE]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CtaRow
                primaryHref="/sign-up"
                primaryLabel="Quero garantir meu acesso"
                secondaryHref={expertHref}
                secondaryLabel="Conversar pelo WhatsApp"
                secondaryExternal
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-white/45">
              Após o cadastro, a equipe libera o acesso à área de membros. Sem cronômetro falso e sem vagas inventadas.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* SEÇÃO 6 — preview da plataforma */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Veja como o conteúdo é organizado por dentro.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
            Mockups leves da experiência real: dashboard, módulos, aula e checklist — sem dados pessoais e sem imagens
            de teste antigas.
          </p>
        </FadeIn>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <FadeIn className="rounded-2xl border border-white/10 bg-[#151019] p-4">
            <p className="text-xs font-bold uppercase text-[#B76CFF]">Dashboard</p>
            <div className="mt-3 space-y-2">
              <div className="h-16 rounded-lg bg-gradient-to-r from-[#53009F]/40 to-transparent" />
              <div className="h-10 rounded-lg bg-white/5" />
              <div className="h-10 rounded-lg bg-white/5" />
            </div>
          </FadeIn>
          <FadeIn className="rounded-2xl border border-white/10 bg-[#151019] p-4">
            <p className="text-xs font-bold uppercase text-[#B76CFF]">Módulos</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-lg border border-white/8 bg-black/30 p-3">
                  <BookOpen className="h-4 w-4 text-[#8A1DEE]" />
                  <p className="mt-2 text-xs font-bold text-white/80">Módulo {n}</p>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn className="rounded-2xl border border-white/10 bg-[#151019] p-4">
            <p className="text-xs font-bold uppercase text-[#B76CFF]">Aula + checklist</p>
            <div className="mt-3 space-y-2">
              <div className="h-8 rounded bg-white/8" />
              <div className="h-8 rounded bg-white/5" />
              <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-3 py-2 text-xs text-white/70">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#8A1DEE]" />
                Item de aplicação
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-3 py-2 text-xs text-white/70">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#8A1DEE]" />
                Progresso salvo
              </div>
            </div>
          </FadeIn>
        </div>
        <p className="mt-4 text-sm text-white/50">
          Depoimentos de alunos serão publicados aqui quando houver cadastro oficial. Enquanto isso, a prova é o
          método, a trilha e a experiência de quem opera delivery.
        </p>
      </section>

      {/* SEÇÃO 7 — FAQ */}
      <section id="faq" className="border-y border-white/8 bg-[#0b0711]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <FadeIn>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Perguntas frequentes</h2>
            <p className="mt-4 text-base leading-7 text-white/65">
              Dúvidas comuns sobre o treinamento, acesso e suporte.
            </p>
            <div className="mt-6">
              <SupportButton settings={support} label="Falar com o suporte" />
            </div>
          </FadeIn>
          <SalesFaq />
        </div>
      </section>

      {/* SEÇÃO 8 — corporativo */}
      <footer className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(138,29,238,.25),transparent_45%),linear-gradient(180deg,#0b0711,#07040c)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <FadeIn>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">MiBusca Academy · MiBusca Brasil</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Treinamento e acompanhamento para gestores de delivery que querem operar o iFood com método.
            </p>
          </FadeIn>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/sign-up" className="text-sm font-bold text-[#B76CFF] hover:underline">
              Solicitar acesso
            </Link>
            <Link href="/sign-in" className="text-sm font-bold text-white/70 hover:underline">
              Já tenho login
            </Link>
            <SupportButton variant="footer" settings={support} />
            {support.supportEmail ? (
              <a href={`mailto:${support.supportEmail}`} className="text-sm font-semibold text-white/60 hover:text-white">
                {support.supportEmail}
              </a>
            ) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-xs text-white/40">
            <Link href="/sign-up" className="hover:text-white/70">
              Política de privacidade
            </Link>
            <Link href="/sign-up" className="hover:text-white/70">
              Termos de uso
            </Link>
            <span>© {year} MiBusca Academy</span>
          </div>
          <div className="mt-8">
            <CtaRow primaryHref="/sign-up" primaryLabel="Quero acessar o treinamento" secondaryHref="/sign-in" secondaryLabel="Já tenho login" />
          </div>
        </div>
      </footer>

      <SupportButton variant="float" settings={support} className="!bottom-6" />
    </main>
  );
}
