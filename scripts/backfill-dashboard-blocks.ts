import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function nextBlockOrder(courseId: string) {
  const last = await prisma.dashboardBlock.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true }
  });

  return last ? last.order + 1 : 1;
}

async function main() {
  const course = await prisma.course.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true
    }
  });

  if (!course) {
    console.log("Nenhum curso encontrado.");
    return;
  }

  const [banners, categorias] = await Promise.all([
    prisma.banner.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        imageUrl: true,
        images: { select: { id: true } },
        dashboardBlock: { select: { id: true } }
      }
    }),
    prisma.categoria.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        dashboardBlock: { select: { id: true } }
      }
    })
  ]);

  let createdImages = 0;
  let createdBlocks = 0;

  for (const banner of banners) {
    if (!banner.images.length && banner.imageUrl) {
      await prisma.bannerImage.create({
        data: {
          bannerId: banner.id,
          imageUrl: banner.imageUrl,
          order: 1
        }
      });
      createdImages += 1;
    }

    if (!banner.dashboardBlock) {
      await prisma.dashboardBlock.create({
        data: {
          courseId: course.id,
          type: "BANNER",
          bannerId: banner.id,
          order: await nextBlockOrder(course.id)
        }
      });
      createdBlocks += 1;
    }
  }

  for (const categoria of categorias) {
    if (!categoria.dashboardBlock) {
      await prisma.dashboardBlock.create({
        data: {
          courseId: course.id,
          type: "CATEGORY",
          categoriaId: categoria.id,
          order: await nextBlockOrder(course.id)
        }
      });
      createdBlocks += 1;
    }
  }

  console.log({ createdImages, createdBlocks });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
