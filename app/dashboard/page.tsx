import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BannerCarousel, type StudentBanner } from "@/components/student/banner-carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireApprovedStudent } from "@/lib/auth";
import { resolveAssetUrl } from "@/lib/assets";
import { firstUnlockedLesson, getStudentCourse } from "@/lib/course";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireApprovedStudent();
  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent profileId={profile.id} />
      </Suspense>
    </AppShell>
  );
}

async function DashboardContent({ profileId }: { profileId: string }) {
  const [data, bannerRecords] = await Promise.all([
    getStudentCourse(profileId),
    prisma.banner.findMany({
      where: { status: "ACTIVE" },
      orderBy: { order: "asc" },
      select: {
        id: true,
        imageUrl: true,
        title: true,
        subtitle: true,
        targetType: true,
        targetId: true,
        targetUrl: true
      }
    })
  ]);
  const nextLesson = firstUnlockedLesson(data.flatLessons);
  const course = data.course;
  const categoryIds = new Set(data.categorias.map((categoria) => categoria.id));
  const banners: StudentBanner[] = bannerRecords
    .map((banner) => {
      const resolvedImageUrl = resolveAssetUrl(banner.imageUrl);
      if (!resolvedImageUrl) return null;

      let href: string | null = null;
      if (banner.targetType === "URL" && banner.targetUrl) {
        href = banner.targetUrl;
      }
      if (banner.targetType === "CATEGORY" && banner.targetId && categoryIds.has(banner.targetId)) {
        href = `#categoria-${banner.targetId}`;
      }
      if (banner.targetType === "MODULE" && banner.targetId) {
        const targetModule = data.modules.find((module) => module.id === banner.targetId);
        const targetLesson = targetModule?.lessons.find((lesson) => !lesson.locked) || targetModule?.lessons[0];
        href = targetLesson ? `/curso/${targetLesson.id}` : null;
      }

      return {
        id: banner.id,
        imageUrl: resolvedImageUrl,
        title: banner.title,
        subtitle: banner.subtitle,
        href
      };
    })
    .filter((banner): banner is StudentBanner => Boolean(banner));

  const fallbackBannerUrl = resolveAssetUrl(course?.bannerUrl);
  const fallbackBanners: StudentBanner[] = fallbackBannerUrl
    ? [
        {
          id: "course-banner",
          imageUrl: fallbackBannerUrl,
          title: course?.hideText ? null : course?.title || "Conhecimento iFood",
          subtitle: course?.hideText ? null : course?.description || "Curso pratico para dominar funil, cardapio, campanhas, ROI, precificacao e operacao dentro do iFood.",
          href: null
        }
      ]
    : [];
  const visibleBanners = banners.length ? banners : fallbackBanners;

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8">
      <BannerCarousel banners={visibleBanners} />

      <section className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Continuar de onde parei</CardTitle>
          </CardHeader>
          <CardContent>
            {nextLesson ? (
              <Link href={`/curso/${nextLesson.id}`} className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-sm text-[#8A1DEE]">Modulo {nextLesson.moduleNumber}</p>
                  <h2 className="mt-1 break-words text-xl font-bold">{nextLesson.title}</h2>
                  <p className="mt-2 break-words text-sm text-white/58">{nextLesson.moduleTitle}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#8A1DEE]" />
              </Link>
            ) : (
              <p className="text-white/65">Todas as aulas publicadas foram concluidas.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Seu progresso</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/[0.04] p-4">
              <BookOpen className="mb-3 h-5 w-5 text-[#8A1DEE]" />
              <strong className="text-3xl">{data.totalLessons}</strong>
              <p className="text-sm text-white/58">Aulas</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-4">
              <CheckCircle2 className="mb-3 h-5 w-5 text-[#8A1DEE]" />
              <strong className="text-3xl">{data.completedLessons}</strong>
              <p className="text-sm text-white/58">Concluidas</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-9">
        {data.categorias.map((categoria) => (
          <div key={categoria.id} id={`categoria-${categoria.id}`} className="min-w-0 scroll-mt-24">
            <div className="mb-4">
              <h2 className="break-words text-2xl font-bold">{categoria.title}</h2>
              {categoria.description ? <p className="mt-1 break-words text-sm text-white/55">{categoria.description}</p> : null}
            </div>
            <div className="module-shelf flex snap-x gap-4 overflow-x-auto pb-5">
              {categoria.modules.length ? (
                categoria.modules.map((module) => {
                  const targetLesson = module.lessons.find((lesson) => !lesson.locked) || module.lessons[0];
                  const href = !module.locked && targetLesson ? `/curso/${targetLesson.id}` : null;
                  const coverUrl = resolveAssetUrl(module.coverImagePath);
                  const showModuleText = !module.hideText;
                  const card = (
                    <div className="group relative h-[292px] w-[220px] shrink-0 snap-start overflow-hidden rounded-lg border border-white/10 bg-[#151019] shadow-xl transition hover:border-[#8A1DEE]/60">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={module.title || `Modulo ${module.number}`} fill sizes="220px" className="object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(138,29,238,.55),transparent_35%),linear-gradient(145deg,#08050d,#1a1023_55%,#050306)]" />
                      )}
                      {showModuleText ? <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" /> : null}
                      <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/65 text-xs font-bold text-white shadow-lg">
                        {module.percent}%
                      </div>
                      {module.locked ? (
                        <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/75">
                          <Lock className="h-4 w-4" />
                        </div>
                      ) : null}
                      {showModuleText ? (
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#8A1DEE]">Modulo {module.number}</p>
                          {module.title ? <h3 className="mt-2 line-clamp-3 break-words text-xl font-black leading-tight text-white">{module.title}</h3> : null}
                          <p className="mt-3 text-xs text-white/70">{module.completedCount}/{module.lessonCount} aulas concluidas</p>
                          <div className="mt-3">
                            <Progress value={module.percent} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );

                  return href ? (
                    <Link key={module.id} href={href} aria-label={`Abrir ${module.title || `Modulo ${module.number}`}`}>
                      {card}
                    </Link>
                  ) : (
                    <div key={module.id} className="opacity-55">
                      {card}
                    </div>
                  );
                })
              ) : (
                <div className="flex h-[160px] w-full items-center justify-center rounded-lg border border-dashed border-white/15 text-sm text-white/45">
                  Esta categoria ainda nao tem modulos.
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="h-56 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[292px] w-[220px] shrink-0 animate-pulse rounded-lg bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
