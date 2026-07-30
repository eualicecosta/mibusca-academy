import { CourseContentEditor } from "@/components/admin/course-content-editor";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const profile = await requireAdmin();
  const [course, banners] = await Promise.all([
    prisma.course.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        bannerUrl: true,
        hideText: true,
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
                lessons: {
                  orderBy: { order: "asc" },
                  select: {
                    id: true,
                    progress: { where: { completed: true }, select: { id: true } }
                  }
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-images";
  const storageBaseUrl = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${bucket}` : null;
  const storageUploadReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
      {course ? (
        <CourseContentEditor
          course={{
            id: course.id,
            title: course.title,
            description: course.description,
            bannerUrl: course.bannerUrl,
            hideText: course.hideText
          }}
          banners={banners}
          categorias={course.categorias.map((categoria) => ({
            id: categoria.id,
            title: categoria.title,
            description: categoria.description,
            coverImagePath: categoria.coverImagePath,
            order: categoria.order,
            status: categoria.status,
            modules: categoria.modules.map((module) => {
              const lessonCount = module.lessons.length;
              const completedLessons = module.lessons.filter((lesson) => lesson.progress.length > 0).length;
              const percent = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;

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
                completedLessons,
                percent
              };
            })
          }))}
          allModules={course.categorias.flatMap((categoria) =>
            categoria.modules.map((module) => {
              const lessonCount = module.lessons.length;
              const completedLessons = module.lessons.filter((lesson) => lesson.progress.length > 0).length;
              const percent = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;

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
                completedLessons,
                percent
              };
            })
          )}
          storageBaseUrl={storageBaseUrl}
          storageUploadReady={storageUploadReady}
        />
      ) : (
        <div className="mx-auto max-w-4xl rounded-lg border border-white/10 bg-[#151019] p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Editor de conteudo</p>
          <h1 className="mt-2 break-words text-3xl font-bold">Nenhum curso encontrado</h1>
          <p className="mt-3 text-white/62">Rode o seed inicial para cadastrar o curso base antes de editar categorias e aulas.</p>
        </div>
      )}
    </AppShell>
  );
}
