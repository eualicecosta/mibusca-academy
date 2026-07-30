import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sourcePath = path.join(process.cwd(), "data", "course_content.md");

type ParsedLesson = {
  number: string;
  title: string;
  objective: string;
  context: string;
  stepsHeading: string;
  steps: string[];
  tipKind: string | null;
  tipText: string | null;
  checklist: string[];
  imagePath: string | null;
  imageCaption: string | null;
};

type ParsedModule = {
  number: string;
  title: string;
  objective: string;
  lessons: ParsedLesson[];
};

function parseCourseMarkdown() {
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const lines = markdown.split(/\r?\n/);
  const modules: ParsedModule[] = [];
  let currentModule: ParsedModule | null = null;
  let currentLesson: ParsedLesson | null = null;
  let section: "steps" | "checklist" | null = null;

  const moduleRe = /^## Módulo\s+(\d+)(?:\s+\(Bônus\))?\s+—\s+(.+)$/;
  const lessonRe = /^### Aula\s+([\d.]+)\s+—\s+(.+)$/;
  const imageRe = /`\[IMAGEM:\s*([^\]]+)\]`\s*(?:—\s*(.*))?/;

  for (const raw of lines) {
    const line = raw.trim();
    const moduleMatch = moduleRe.exec(line);
    if (moduleMatch) {
      currentModule = {
        number: moduleMatch[1],
        title: moduleMatch[2],
        objective: "",
        lessons: []
      };
      modules.push(currentModule);
      currentLesson = null;
      section = null;
      continue;
    }

    const lessonMatch = lessonRe.exec(line);
    if (lessonMatch && currentModule) {
      currentLesson = {
        number: lessonMatch[1],
        title: lessonMatch[2],
        objective: "",
        context: "",
        stepsHeading: "Passo a passo",
        steps: [],
        tipKind: null,
        tipText: null,
        checklist: [],
        imagePath: null,
        imageCaption: null
      };
      currentModule.lessons.push(currentLesson);
      section = null;
      continue;
    }

    if (!currentLesson) {
      continue;
    }

    const imageMatch = imageRe.exec(line);
    if (imageMatch) {
      currentLesson.imagePath = imageMatch[1].trim();
      currentLesson.imageCaption = imageMatch[2]?.trim() || null;
      continue;
    }

    if (line.startsWith("**Objetivo:**")) {
      currentLesson.objective = line.replace("**Objetivo:**", "").trim();
      section = null;
      continue;
    }
    if (line.startsWith("**Contexto:**")) {
      currentLesson.context = line.replace("**Contexto:**", "").trim();
      section = null;
      continue;
    }
    if (line.startsWith("**Passo a passo")) {
      currentLesson.stepsHeading = line.replace(/\*\*/g, "").replace(/:$/, "");
      section = "steps";
      continue;
    }
    if (line.startsWith("**Dica:**")) {
      currentLesson.tipKind = "Dica";
      currentLesson.tipText = line.replace("**Dica:**", "").trim();
      section = null;
      continue;
    }
    if (line.startsWith("**Atenção:**")) {
      currentLesson.tipKind = "Atenção";
      currentLesson.tipText = line.replace("**Atenção:**", "").trim();
      section = null;
      continue;
    }
    if (line.startsWith("**Checklist de conclusão:**")) {
      section = "checklist";
      continue;
    }

    if (section === "steps") {
      const stepMatch = /^\d+\.\s+(.+)$/.exec(line);
      if (stepMatch) {
        currentLesson.steps.push(stepMatch[1]);
      }
      continue;
    }

    if (section === "checklist" && line.startsWith("- [ ] ")) {
      currentLesson.checklist.push(line.replace("- [ ] ", ""));
    }
  }

  modules.forEach((module) => {
    module.objective = module.lessons[0]?.objective || "";
  });

  return modules;
}

async function main() {
  const modules = parseCourseMarkdown();
  await prisma.course.deleteMany({ where: { slug: "conhecimento-ifood" } });

  const course = await prisma.course.create({
    data: {
      slug: "conhecimento-ifood",
      title: "Conhecimento iFood",
      description: "Apostila interativa da MiBusca Brasil para dominar a operação no iFood.",
      status: "PUBLISHED"
    }
  });

  const generalCategoria = await prisma.categoria.create({
    data: {
      courseId: course.id,
      title: "Geral",
      description: "Categoria temporaria para organizar os modulos existentes.",
      order: 1,
      status: "PUBLISHED"
    }
  });

  for (const [moduleIndex, module] of modules.entries()) {
    const createdModule = await prisma.module.create({
      data: {
        courseId: course.id,
        categoriaId: generalCategoria.id,
        number: module.number,
        title: module.title,
        objective: module.objective,
        order: moduleIndex + 1,
        status: "PUBLISHED"
      }
    });

    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      const createdLesson = await prisma.lesson.create({
        data: {
          moduleId: createdModule.id,
          number: lesson.number,
          title: lesson.title,
          objective: lesson.objective,
          context: lesson.context,
          order: lessonIndex + 1,
          status: "PUBLISHED",
          tipKind: lesson.tipKind,
          tipText: lesson.tipText,
          imagePath: lesson.imagePath,
          imageCaption: lesson.imageCaption
        }
      });

      for (const [stepIndex, step] of lesson.steps.entries()) {
        await prisma.contentBlock.create({
          data: {
            lessonId: createdLesson.id,
            type: "STEP",
            order: stepIndex + 1,
            content: step,
            imagePath: stepIndex === 0 ? lesson.imagePath : null,
            imageCaption: stepIndex === 0 ? lesson.imageCaption : null
          }
        });
      }

      for (const [checkIndex, item] of lesson.checklist.entries()) {
        await prisma.checklistItem.create({
          data: {
            lessonId: createdLesson.id,
            text: item,
            order: checkIndex + 1
          }
        });
      }
    }
  }

  const adminClerkId = process.env.ADMIN_CLERK_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminClerkId && adminEmail) {
    await prisma.userProfile.upsert({
      where: { clerkId: adminClerkId },
      create: {
        clerkId: adminClerkId,
        email: adminEmail.toLowerCase(),
        name: process.env.ADMIN_NAME || "Admin MiBusca",
        role: "ADMIN",
        status: "ACTIVE",
        approvedAt: new Date()
      },
      update: {
        role: "ADMIN",
        status: "ACTIVE",
        approvedAt: new Date()
      }
    });
  }

  console.log(`Seed concluído: ${modules.length} módulos e ${modules.reduce((total, module) => total + module.lessons.length, 0)} aulas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
