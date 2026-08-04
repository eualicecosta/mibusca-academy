/**
 * One-shot: set Module.number to 0-based index within each categoria.
 * Does not change titles, IDs, lessons, or progress.
 *
 *   npx tsx scripts/renumber-modules-by-category.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categorias = await prisma.categoria.findMany({
    select: { id: true, title: true },
    orderBy: { order: "asc" }
  });

  for (const cat of categorias) {
    const modules = await prisma.module.findMany({
      where: { categoriaId: cat.id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, number: true, order: true, title: true }
    });

    console.log(
      JSON.stringify({
        categoria: cat.title,
        count: modules.length,
        before: modules.map((m) => ({ number: m.number, order: m.order, title: m.title.slice(0, 40) }))
      })
    );

    if (!modules.length) continue;

    await prisma.$transaction([
      ...modules.map((m, index) =>
        prisma.module.update({
          where: { id: m.id },
          data: { order: -2000 - index }
        })
      ),
      ...modules.map((m, index) =>
        prisma.module.update({
          where: { id: m.id },
          data: { order: index + 1, number: String(index) }
        })
      )
    ]);
  }

  console.log(JSON.stringify({ event: "renumber_complete", categorias: categorias.length }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
