import { notFound } from "next/navigation";
import { LessonBlockBuilder } from "@/components/admin/lesson-block-builder";
import { getR2PublicBaseUrl } from "@/lib/assets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Admin lesson editor — opens directly into the two-column builder.
 * Module metadata / progress stats live on other admin screens.
 */
export default async function AdminModuleContentPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          order: true,
          status: true
        }
      }
    }
  });

  if (!courseModule) {
    notFound();
  }

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-72px)] min-h-0 flex-col overflow-hidden lg:-mr-8">
      <LessonBlockBuilder
        moduleId={courseModule.id}
        storageBaseUrl={getR2PublicBaseUrl()}
        lessons={courseModule.lessons.map((lesson) => ({
          id: lesson.id,
          number: lesson.number,
          title: lesson.title,
          order: lesson.order,
          status: lesson.status
        }))}
      />
    </div>
  );
}
