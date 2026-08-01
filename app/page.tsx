import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getLandingStats() {
  try {
    const course = await prisma.course.findFirst({
      where: { slug: "conhecimento-ifood" },
      select: {
        title: true,
        description: true,
        categorias: {
          where: { status: "PUBLISHED" },
          select: {
            modules: {
              where: { status: "PUBLISHED" },
              select: {
                lessons: { where: { status: "PUBLISHED" }, select: { id: true } }
              }
            }
          }
        }
      }
    });

    if (!course) {
      return { title: "Conhecimento iFood", lessonCount: 0, moduleCount: 0, description: null as string | null };
    }

    const modules = course.categorias.flatMap((c) => c.modules);
    const lessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);
    return {
      title: course.title || "Conhecimento iFood",
      description: course.description,
      moduleCount: modules.length,
      lessonCount
    };
  } catch {
    return { title: "Conhecimento iFood", lessonCount: 0, moduleCount: 0, description: null as string | null };
  }
}

/**
 * Public landing — no test/community banner images.
 * Clean gradient hero + short copy only.
 */
export default async function HomePage() {
  const stats = await getLandingStats();

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
              <span className="hidden text-xs text-white/55 sm:block">Treinamento para operação no iFood</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="hidden rounded-lg border border-white/12 px-4 py-2.5 text-sm font-bold text-white/78 transition hover:bg-white/10 sm:inline-flex"
              href="/sign-in"
            >
              Entrar
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-[#53009F] px-3 py-2.5 text-sm font-bold shadow-lg shadow-[#53009F]/25 transition hover:bg-[#8A1DEE] sm:px-4"
              href="/sign-up"
            >
              Solicitar acesso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        {/* Pure brand gradient — no external test banner image */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(138,29,238,.35),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(83,0,159,.28),transparent_40%),linear-gradient(160deg,#07040c_0%,#12081c_50%,#07040c_100%)]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-center px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#8A1DEE]/45 bg-black/30 px-3 py-1.5 text-xs font-bold uppercase text-white/78">
              <LockKeyhole className="h-4 w-4 shrink-0 text-[#8A1DEE]" />
              <span className="truncate">Acesso por aprovação</span>
            </div>

            <h1 className="mt-6 break-words text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {stats.title}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              {stats.description?.trim() ||
                "Curso prático da MiBusca Brasil para operar no iFood com método: funil, cardápio, campanhas e rotina."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-6 text-sm font-bold shadow-xl shadow-[#53009F]/30 transition hover:bg-[#8A1DEE] sm:text-base"
                href="/sign-up"
              >
                Solicitar meu acesso
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/14 bg-black/25 px-6 text-sm font-bold text-white/85 transition hover:bg-white/10 sm:text-base"
                href="/sign-in"
              >
                Já tenho login
              </Link>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                [stats.moduleCount || "10+", "módulos"],
                [stats.lessonCount || "29", "aulas"],
                ["Manual", "aprovação"]
              ].map(([value, label]) => (
                <div key={String(label)} className="rounded-lg border border-white/12 bg-black/35 p-3 text-center sm:p-4">
                  <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
                  <p className="mt-1 text-xs font-bold text-white/55 sm:text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0b0711]">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {[
            {
              icon: BookOpen,
              title: "Trilha organizada",
              text: "Categorias, módulos e aulas em sequência clara."
            },
            {
              icon: CheckCircle2,
              title: "Aplicação prática",
              text: "Checklist e progresso salvos por aluno."
            },
            {
              icon: ShieldCheck,
              title: "Acesso controlado",
              text: "Cadastro com aprovação manual da equipe."
            }
          ].map((item) => (
            <article key={item.title} className="rounded-lg border border-white/10 bg-[#151019] p-5">
              <item.icon className="h-6 w-6 text-[#8A1DEE]" />
              <h2 className="mt-4 text-lg font-bold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/62">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#151019] p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Pronto para começar?</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
            Solicite o cadastro e aguarde a aprovação. Depois do liberar, o conteúdo aparece na sua área de membros.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-6 text-sm font-bold transition hover:bg-[#8A1DEE]"
              href="/sign-up"
            >
              Solicitar cadastro
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/12 px-6 text-sm font-bold text-white/75 transition hover:bg-white/10"
              href="/sign-in"
            >
              Já tenho acesso
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07040c]/95 p-3 backdrop-blur sm:hidden">
        <Link className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-4 font-bold" href="/sign-up">
          Solicitar acesso
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="h-20 sm:hidden" aria-hidden />
    </main>
  );
}
