import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CourseCategoria = Awaited<ReturnType<typeof getStudentCourse>>["categorias"][number];
export type CourseModule = Awaited<ReturnType<typeof getStudentCourse>>["modules"][number];
export type CourseLesson = CourseModule["lessons"][number];

async function queryCourseStructure() {
  return prisma.course.findFirst({
    where: { slug: "conhecimento-ifood", status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      bannerUrl: true,
      hideText: true,
      categorias: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          coverImagePath: true,
          order: true,
          status: true,
          modules: {
            where: { status: "PUBLISHED" },
            orderBy: { order: "asc" },
            select: {
              id: true,
              number: true,
              title: true,
              objective: true,
              coverImagePath: true,
              hideText: true,
              order: true,
              status: true,
              lessons: {
                where: { status: "PUBLISHED" },
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  number: true,
                  title: true,
                  objective: true,
                  order: true,
                  status: true
                }
              }
            }
          }
        }
      }
    }
  });
}

const getCachedCourseStructure = unstable_cache(
  queryCourseStructure,
  ["course-structure"],
  { revalidate: 300, tags: ["course-structure"] }
);

async function getCourseStructure() {
  try {
    return await getCachedCourseStructure();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return queryCourseStructure();
    }
    throw error;
  }
}

export async function getStudentCourse(userId: string) {
  const [course, completedProgress] = await Promise.all([
    getCourseStructure(),
    prisma.lessonProgress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true }
    })
  ]);

  if (!course) {
    return { course: null, categorias: [], modules: [], flatLessons: [], totalLessons: 0, completedLessons: 0, percent: 0 };
  }

  const completedLessonIds = new Set(completedProgress.map((item) => item.lessonId));
  const categorias = course.categorias.map((categoria) => {
    const modules = categoria.modules.map((module) => {
      const completedCount = module.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
      const lessonCount = module.lessons.length;
      return {
        ...module,
        categoriaId: categoria.id,
        categoriaTitle: categoria.title,
        lessonCount,
        completedCount,
        percent: lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0,
        complete: lessonCount > 0 && completedCount === lessonCount
      };
    });

    const modulesWithLocks = modules.map((module, index) => {
      const previousModulesComplete = modules.slice(0, index).every((item) => item.complete || item.lessonCount === 0);
      let previousLessonsComplete = true;
      const lessons = module.lessons.map((lesson) => {
        const completed = completedLessonIds.has(lesson.id);
        const locked = !previousModulesComplete || !previousLessonsComplete;
        previousLessonsComplete = completed;
        return { ...lesson, completed, locked };
      });
      return { ...module, locked: !previousModulesComplete, lessons };
    });

    return { ...categoria, modules: modulesWithLocks };
  });

  const modulesWithLocks = categorias.flatMap((categoria) => categoria.modules);
  const flatLessons = modulesWithLocks.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title,
      moduleNumber: module.number,
      categoriaId: module.categoriaId,
      categoriaTitle: module.categoriaTitle
    }))
  );
  const totalLessons = flatLessons.length;
  const completedLessons = flatLessons.filter((lesson) => lesson.completed).length;

  return {
    course,
    categorias,
    modules: modulesWithLocks,
    flatLessons,
    totalLessons,
    completedLessons,
    percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
  };
}

export async function getLessonForStudent(userId: string, lessonId: string) {
  const structure = await getStudentCourse(userId);
  const currentIndex = structure.flatLessons.findIndex((lesson) => lesson.id === lessonId);
  const current = currentIndex >= 0 ? structure.flatLessons[currentIndex] : null;

  if (!current) {
    return { ...structure, current: null, previous: null, next: null, checklist: [], checkedItemIds: new Set<string>() };
  }

  const { lesson, checked } = await getLessonContentForStudent(userId, current.id);

  return {
    ...structure,
    current: lesson ? { ...current, detail: lesson } : null,
    previous: currentIndex > 0 ? structure.flatLessons[currentIndex - 1] : null,
    next: currentIndex < structure.flatLessons.length - 1 ? structure.flatLessons[currentIndex + 1] : null,
    checklist: lesson?.checklistItems || [],
    checkedItemIds: new Set(checked.map((item) => item.checklistItemId))
  };
}

export async function getLessonContentForStudent(userId: string, lessonId: string) {
  const [lesson, checked] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        objective: true,
        context: true,
        tipKind: true,
        tipText: true,
        blocks: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            order: true,
            content: true,
            imagePath: true,
            imageCaption: true
          }
        },
        checklistItems: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            text: true,
            order: true
          }
        }
      }
    }),
    prisma.checklistCompletion.findMany({
      where: {
        userId,
        checklistItem: {
          lessonId
        },
        checked: true
      },
      select: { checklistItemId: true }
    })
  ]);

  return { lesson, checked };
}

export function firstUnlockedLesson<T extends { id: string; completed: boolean; locked: boolean }>(flatLessons: T[]) {
  return flatLessons.find((lesson) => !lesson.completed && !lesson.locked) || flatLessons.find((lesson) => !lesson.locked);
}
