import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveAssetUrl } from "@/lib/assets";

type LandingModule = {
  number: string;
  title: string;
  objective: string | null;
  lessons: { id: string }[];
};

type LandingCategory = {
  title: string;
  description: string | null;
  modules: LandingModule[];
};

type LandingCourse = {
  title: string;
  description: string | null;
  bannerUrl: string | null;
  categorias: LandingCategory[];
};

const fallbackCategories: LandingCategory[] = [
  {
    title: "Comece por aqui",
    description: "Base estratégica para parar de operar no escuro.",
    modules: [
      {
        number: "0",
        title: "Mentalidade: Como Pensar Dentro do iFood",
        objective: "Entenda por que gerenciar no iFood exige estratégia, leitura de dados e rotina.",
        lessons: [{ id: "fallback-1" }]
      },
      {
        number: "1",
        title: "Entendendo o Funil de Vendas no iFood",
        objective: "Aprenda a enxergar onde a operação perde venda antes de trocar preço ou anúncio.",
        lessons: [{ id: "fallback-2" }, { id: "fallback-3" }]
      }
    ]
  },
  {
    title: "Operação que converte",
    description: "Precificação, combos, cardápio e campanhas com lógica.",
    modules: [
      {
        number: "3",
        title: "Precificação Inteligente",
        objective: "Monte preços com margem, percepção de valor e competitividade.",
        lessons: [{ id: "fallback-4" }, { id: "fallback-5" }, { id: "fallback-6" }]
      },
      {
        number: "6",
        title: "Criando Combos que Aumentam o Lucro",
        objective: "Use combos para elevar ticket médio sem destruir margem.",
        lessons: [{ id: "fallback-7" }, { id: "fallback-8" }, { id: "fallback-9" }]
      }
    ]
  }
];

async function getLandingCourse(): Promise<LandingCourse> {
  try {
    const course = await prisma.course.findFirst({
      where: { slug: "conhecimento-ifood" },
      select: {
        title: true,
        description: true,
        bannerUrl: true,
        categorias: {
          where: { status: "PUBLISHED" },
          orderBy: { order: "asc" },
          select: {
            title: true,
            description: true,
            modules: {
              where: { status: "PUBLISHED" },
              orderBy: { order: "asc" },
              select: {
                number: true,
                title: true,
                objective: true,
                lessons: {
                  where: { status: "PUBLISHED" },
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });

    if (course) return course;
  } catch {
    // A pagina publica continua disponivel mesmo se o banco estiver indisponivel.
  }

  return {
    title: "Conhecimento iFood",
    description: "Curso pratico da MiBusca Brasil para dominar funil, cardapio, campanhas, ROI, precificacao e operacao dentro do iFood.",
    bannerUrl: null,
    categorias: fallbackCategories
  };
}

function countLessons(categories: LandingCategory[]) {
  return categories.reduce((total, category) => total + category.modules.reduce((sum, module) => sum + module.lessons.length, 0), 0);
}

function flatModules(categories: LandingCategory[]) {
  return categories.flatMap((category) =>
    category.modules.map((module) => ({
      ...module,
      categoryTitle: category.title
    }))
  );
}

export default async function HomePage() {
  const course = await getLandingCourse();
  const bannerUrl = resolveAssetUrl(course.bannerUrl);
  const modules = flatModules(course.categorias);
  const lessonCount = countLessons(course.categorias);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07040c] text-[#F5F3F3]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07040c]/88 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/12 bg-[#111017] text-lg font-bold shadow-lg shadow-[#53009F]/15">
              M
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold">MiBusca Academy</span>
              <span className="hidden text-sm text-white/55 sm:block">Treinamento para operacao no iFood</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-white/65 lg:flex">
            <a href="#metodo" className="transition hover:text-white">
              Metodo
            </a>
            <a href="#conteudo" className="transition hover:text-white">
              Conteudo
            </a>
            <a href="#acesso" className="transition hover:text-white">
              Acesso
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link className="hidden rounded-lg border border-white/12 px-4 py-2.5 text-sm font-bold text-white/78 transition hover:bg-white/10 sm:inline-flex" href="/sign-in">
              Entrar
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-lg bg-[#53009F] px-4 py-2.5 text-sm font-bold shadow-lg shadow-[#53009F]/25 transition hover:bg-[#8A1DEE]" href="/sign-up">
              Solicitar acesso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt="Conhecimento iFood"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-48"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#07040c_0%,rgba(7,4,12,.88)_38%,rgba(7,4,12,.46)_70%,#07040c_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,4,12,.18)_0%,#07040c_100%)]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#8A1DEE]/45 bg-black/28 px-3 py-1.5 text-xs font-bold uppercase text-white/78">
              <LockKeyhole className="h-4 w-4 text-[#8A1DEE]" />
              <span className="truncate">Acesso fechado por aprovacao</span>
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-bold leading-[1.02] text-white sm:text-6xl lg:text-8xl">
              {course.title || "Conhecimento iFood"}
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-9 text-white/78 sm:text-2xl">
              Curso pratico para transformar cardapio, precificacao, campanhas e dados em uma rotina de crescimento dentro do iFood.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-6 text-base font-bold shadow-2xl shadow-[#53009F]/35 transition hover:bg-[#8A1DEE]" href="/sign-up">
                Solicitar meu acesso
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link className="inline-flex h-13 items-center justify-center gap-2 rounded-lg border border-white/14 bg-black/22 px-6 text-base font-bold text-white/82 transition hover:bg-white/10" href="/sign-in">
                Ja tenho login
              </Link>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["10+", "modulos"],
                [`${lessonCount || 29}`, "aulas"],
                ["100%", "aplicavel"],
                ["Manual", "aprovacao"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/12 bg-black/30 p-4 backdrop-blur">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-sm font-bold text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="metodo" className="border-y border-white/8 bg-[#0b0711]">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              icon: Target,
              title: "Diagnostico antes de acao",
              text: "Voce entende onde a loja perde resultado antes de mexer em preco, campanha ou cardapio."
            },
            {
              icon: BarChart3,
              title: "Decisao guiada por numeros",
              text: "Aulas pensadas para ler funil, ROI, conversao e comportamento de compra com clareza."
            },
            {
              icon: ClipboardCheck,
              title: "Execucao com checklist",
              text: "Cada aula termina com itens praticos para aplicar e acompanhar o progresso dentro da plataforma."
            }
          ].map((item) => (
            <article key={item.title} className="rounded-lg border border-white/10 bg-[#151019] p-6">
              <item.icon className="h-7 w-7 text-[#8A1DEE]" />
              <h2 className="mt-5 text-xl font-bold text-white">{item.title}</h2>
              <p className="mt-3 text-base leading-7 text-white/64">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-[#8A1DEE]">Para vender melhor</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-white sm:text-5xl">
              O problema nao e so aparecer. E converter com margem.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/65">
              A plataforma organiza o conhecimento que o aluno precisa para sair do improviso: funil, cardapio, ofertas, campanhas, precificacao, ROI e operacao diaria.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Identificar gargalos do funil antes de aumentar investimento.",
              "Criar ofertas e combos com objetivo claro de margem e ticket.",
              "Organizar o cardapio para reduzir friccao na escolha.",
              "Medir campanhas por resultado, nao por impressao bonita."
            ].map((text) => (
              <div key={text} className="flex gap-3 rounded-lg border border-white/10 bg-[#151019] p-5">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#8A1DEE]" />
                <p className="text-base leading-7 text-white/72">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="conteudo" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-[#8A1DEE]">Conteudo do curso</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl">Trilha para operar com criterio</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/62">
              Os modulos aparecem em uma area navegavel, com aulas sequenciais e progresso salvo por aluno.
            </p>
          </div>
          <Link className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/12 px-5 py-3 font-bold text-white/78 transition hover:bg-white/10" href="/sign-up">
            Quero acessar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="module-shelf mt-8 flex snap-x gap-5 overflow-x-auto pb-5">
          {(modules.length ? modules.slice(0, 10) : flatModules(fallbackCategories)).map((module) => (
            <article key={`${module.categoryTitle}-${module.number}-${module.title}`} className="min-h-[20rem] w-[17.5rem] shrink-0 snap-start rounded-lg border border-white/10 bg-[#151019] p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full bg-[#8A1DEE]/16 px-3 py-1 text-xs font-bold uppercase text-[#B76CFF]">
                  Modulo {module.number}
                </span>
                <PlayCircle className="h-6 w-6 text-white/45" />
              </div>
              <h3 className="mt-16 text-2xl font-bold leading-tight text-white">{module.title}</h3>
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-white/58">{module.objective || module.categoryTitle}</p>
              <div className="mt-7 h-2 rounded-full bg-white/8">
                <div className="h-full w-1/3 rounded-full bg-[#8A1DEE]" />
              </div>
              <p className="mt-3 text-sm font-bold text-white/55">{module.lessons.length || 1} aulas</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#0b0711]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="lg:col-span-1">
            <p className="text-sm font-bold uppercase text-[#8A1DEE]">Experiencia</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white">Area de membros sem bagunca</h2>
          </div>
          {[
            {
              icon: ShieldCheck,
              title: "Acesso aprovado",
              text: "Cadastro passa por aprovacao manual antes de liberar qualquer aula."
            },
            {
              icon: TrendingUp,
              title: "Progresso real",
              text: "Checklist e conclusao de aula ficam salvos para cada aluno."
            },
            {
              icon: Clock3,
              title: "Estudo continuo",
              text: "Categorias, modulos e aulas ficam organizados para retomar de onde parou."
            }
          ].map((item) => (
            <article key={item.title} className="rounded-lg border border-white/10 bg-[#151019] p-6">
              <item.icon className="h-7 w-7 text-[#8A1DEE]" />
              <h3 className="mt-5 text-xl font-bold text-white">{item.title}</h3>
              <p className="mt-3 text-base leading-7 text-white/62">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="acesso" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase text-[#8A1DEE]">Como funciona</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-5xl">
              Um treinamento fechado para alunos aprovados pela MiBusca Brasil.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
              Voce solicita o cadastro, a equipe valida seu acesso e a plataforma libera o conteudo. Sem aprovacao, a area do aluno continua protegida.
            </p>
          </div>

          <div className="rounded-lg border border-[#8A1DEE]/28 bg-[#151019] p-6 shadow-2xl shadow-[#53009F]/16">
            {[
              "Solicite seu cadastro com e-mail.",
              "Aguarde a aprovacao manual do administrador.",
              "Entre na area de membros e siga a trilha.",
              "Conclua checklists e acompanhe sua evolucao."
            ].map((step, index) => (
              <div key={step} className="flex gap-4 border-b border-white/8 py-4 last:border-b-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#53009F] text-sm font-bold">{index + 1}</span>
                <p className="pt-1 text-base font-bold leading-7 text-white/78">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#151019]">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1fr)] lg:p-12">
            <div>
              <Sparkles className="h-8 w-8 text-[#8A1DEE]" />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-5xl">Pronto para operar o iFood com mais clareza?</h2>
              <p className="mt-5 text-lg leading-8 text-white/64">
                Solicite o acesso e entre na fila de aprovacao. Apos liberado, o curso aparece direto na sua area de membros.
              </p>
            </div>
            <div className="grid content-center gap-3">
              <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-6 text-base font-bold shadow-xl shadow-[#53009F]/25 transition hover:bg-[#8A1DEE]" href="/sign-up">
                Solicitar cadastro agora
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link className="inline-flex min-h-14 items-center justify-center rounded-lg border border-white/12 px-6 text-base font-bold text-white/75 transition hover:bg-white/10" href="/sign-in">
                Ja tenho acesso aprovado
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07040c]/92 p-3 backdrop-blur sm:hidden">
        <Link className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-4 font-bold" href="/sign-up">
          Solicitar acesso
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
