import Link from "next/link";
import { Suspense } from "react";
import { CourseContentEditor } from "@/components/admin/course-content-editor";
import { AdminShell } from "@/components/admin-shell";
import { getR2PublicBaseUrl, storageUploadReady } from "@/lib/assets";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export default async function AdminContentPage() {
  const authStartedAt = isDev ? performance.now() : 0;
  const profile = await requireAdmin();
  if (isDev) {
    console.info(`[perf] admin.conteudo.requireAdmin ${Math.round(performance.now() - authStartedAt)}ms`);
  }

  return (
    <AdminShell userName={profile.name} userEmail={profile.email}>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/imagens" className="text-sm font-semibold text-[#B76CFF] underline-offset-4 hover:underline">
          Banco de imagens (acesso interno)
        </Link>
      </div>
      <Suspense fallback={<ContentEditorSkeleton />}>
        <AdminContentData />
      </Suspense>
    </AdminShell>
  );
}

async function AdminContentData() {
  const startedAt = isDev ? performance.now() : 0;

  // Independent queries after requireAdmin — no student progress join on lessons.
  const [course, banners] = await Promise.all([
    prisma.course.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        bannerUrl: true,
        hideText: true,
        dashboardBlocks: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            order: true,
            bannerId: true,
            categoriaId: true
          }
        },
        categorias: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            coverImagePath: true,
            order: true,
            status: true,
            modules: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                categoriaId: true,
                number: true,
                title: true,
                objective: true,
                coverImagePath: true,
                hideText: true,
                order: true,
                status: true,
                _count: {
                  select: { lessons: true }
                }
              }
            }
          }
        }
      }
    }),
    prisma.banner.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        imageUrl: true,
        images: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            imageUrl: true,
            order: true
          }
        },
        title: true,
        subtitle: true,
        order: true,
        status: true,
        targetType: true,
        targetId: true,
        targetUrl: true
      }
    })
  ]);

  if (isDev) {
    const moduleCount = course?.categorias.reduce((sum, categoria) => sum + categoria.modules.length, 0) || 0;
    console.info(
      `[perf] admin.conteudo.query ${Math.round(performance.now() - startedAt)}ms banners=${banners.length} modules=${moduleCount}`
    );
  }

  const storageBaseUrl = getR2PublicBaseUrl();
  const canUploadToStorage = storageUploadReady();

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-white/10 bg-[#151019] p-6">
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Editor de conteudo</p>
        <h1 className="mt-2 break-words text-3xl font-bold">Nenhum curso encontrado</h1>
        <p className="mt-3 text-white/62">Rode o seed inicial para cadastrar o curso base antes de editar categorias e aulas.</p>
      </div>
    );
  }

  const categorias = course.categorias.map((categoria) => ({
    id: categoria.id,
    title: categoria.title,
    description: categoria.description,
    coverImagePath: categoria.coverImagePath,
    order: categoria.order,
    status: categoria.status,
    modules: categoria.modules.map((module) => {
      const lessonCount = module._count.lessons;
      return {
        id: module.id,
        categoriaId: module.categoriaId,
        number: module.number,
        title: module.title,
        objective: module.objective,
        coverImagePath: module.coverImagePath,
        hideText: module.hideText,
        order: module.order,
        status: module.status,
        lessonCount,
        // Progress metrics not required for editor chrome; keep shape stable for the client component.
        completedLessons: 0,
        percent: 0
      };
    })
  }));

  const allModules = categorias.flatMap((categoria) => categoria.modules);

  return (
    <CourseContentEditor
      course={{
        id: course.id,
        title: course.title,
        description: course.description,
        bannerUrl: course.bannerUrl,
        hideText: course.hideText
      }}
      banners={banners}
      dashboardBlocks={course.dashboardBlocks}
      categorias={categorias}
      allModules={allModules}
      storageBaseUrl={storageBaseUrl}
      storageUploadReady={canUploadToStorage}
    />
  );
}

function ContentEditorSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Carregando editor">
      <div className="h-10 w-80 animate-pulse rounded-lg bg-white/[0.05]" />
      <div className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-64 w-52 shrink-0 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
