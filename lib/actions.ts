"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireApprovedStudent } from "@/lib/auth";
import { sanitizeStorageName, uploadImageToR2 } from "@/lib/r2";

async function uploadImageFile(file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const path = await uploadImageToR2(file, folder);
  // Any successful R2 write can appear in /admin/imagens listing.
  revalidateTag("r2-images");
  return path;
}

async function getOrCreateGeneralCategoria(courseId: string) {
  const existing = await prisma.categoria.findFirst({
    where: { courseId, title: "Geral" },
    select: { id: true }
  });

  if (existing) {
    return existing.id;
  }

  const last = await prisma.categoria.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true }
  });

  const created = await prisma.categoria.create({
    data: {
      courseId,
      title: "Geral",
      description: "Categoria temporaria para organizar modulos sem agrupamento.",
      order: last ? last.order + 1 : 1,
      status: "PUBLISHED"
    },
    select: { id: true }
  });

  return created.id;
}

async function normalizeModuleOrders(categoriaId: string) {
  const modules = await prisma.module.findMany({
    where: { categoriaId },
    orderBy: { order: "asc" },
    select: { id: true }
  });

  if (!modules.length) {
    return;
  }

  await prisma.$transaction([
    ...modules.map((module, index) =>
      prisma.module.update({
        where: { id: module.id },
        data: { order: -1000 - index }
      })
    ),
    ...modules.map((module, index) =>
      prisma.module.update({
        where: { id: module.id },
        data: { order: index + 1 }
      })
    )
  ]);
}

async function normalizeCategoriaOrders(courseId: string) {
  const categorias = await prisma.categoria.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true }
  });

  if (!categorias.length) {
    return;
  }

  await prisma.$transaction([
    ...categorias.map((categoria, index) =>
      prisma.categoria.update({
        where: { id: categoria.id },
        data: { order: -1000 - index }
      })
    ),
    ...categorias.map((categoria, index) =>
      prisma.categoria.update({
        where: { id: categoria.id },
        data: { order: index + 1 }
      })
    )
  ]);
}

async function normalizeBannerOrders() {
  const banners = await prisma.banner.findMany({
    orderBy: { order: "asc" },
    select: { id: true }
  });

  if (!banners.length) {
    return;
  }

  await prisma.$transaction([
    ...banners.map((banner, index) =>
      prisma.banner.update({
        where: { id: banner.id },
        data: { order: -1000 - index }
      })
    ),
    ...banners.map((banner, index) =>
      prisma.banner.update({
        where: { id: banner.id },
        data: { order: index + 1 }
      })
    )
  ]);
}

async function normalizeDashboardBlockOrders(courseId: string) {
  const blocks = await prisma.dashboardBlock.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true }
  });

  if (!blocks.length) {
    return;
  }

  await prisma.$transaction([
    ...blocks.map((block, index) =>
      prisma.dashboardBlock.update({
        where: { id: block.id },
        data: { order: -1000 - index }
      })
    ),
    ...blocks.map((block, index) =>
      prisma.dashboardBlock.update({
        where: { id: block.id },
        data: { order: index + 1 }
      })
    )
  ]);
}

async function nextDashboardBlockOrder(courseId: string) {
  const last = await prisma.dashboardBlock.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true }
  });

  return last ? last.order + 1 : 1;
}

function bannerTargetData(formData: FormData) {
  const targetTypeValue = String(formData.get("targetType") || "");
  const targetType = ["CATEGORY", "MODULE", "URL"].includes(targetTypeValue)
    ? (targetTypeValue as "CATEGORY" | "MODULE" | "URL")
    : null;
  const categoryId = String(formData.get("targetCategoryId") || "").trim();
  const moduleId = String(formData.get("targetModuleId") || "").trim();
  const targetUrl = String(formData.get("targetUrl") || "").trim();

  return {
    targetType,
    targetId: targetType === "CATEGORY" ? categoryId || null : targetType === "MODULE" ? moduleId || null : null,
    targetUrl: targetType === "URL" ? targetUrl || null : null
  };
}

async function bannerImageEntries(formData: FormData, folder: string) {
  const uploaded = await Promise.all(
    ["bannerFile", "bannerFile1", "bannerFile2", "bannerFile3"].map((name) => uploadImageFile(formData.get(name), folder))
  );
  const typed = ["imageUrl", "imageUrl1", "imageUrl2", "imageUrl3"].map((name) => String(formData.get(name) || "").trim());

  return [...uploaded, ...typed].filter((value): value is string => Boolean(value)).slice(0, 3);
}

export async function updateUserApproval(userId: string, status: "PENDING" | "ACTIVE" | "REFUSED" | "PAUSED" | "CANCELLED" | "BLOCKED") {
  await requireAdmin();
  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      status,
      approvedAt: status === "ACTIVE" ? new Date() : undefined,
      blockedAt: status === "BLOCKED" ? new Date() : status === "ACTIVE" ? null : undefined,
      commercialStage:
        status === "ACTIVE" ? "SALE_COMPLETED" : status === "REFUSED" || status === "CANCELLED" ? "SALE_LOST" : undefined
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/membros");
}

export async function updateMemberProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") || "").trim();

  if (!id || !name || !email) {
    return;
  }

  await prisma.userProfile.update({
    where: { id },
    data: {
      name,
      email,
      whatsapp: whatsapp || null
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/membros");
}

export async function toggleChecklistItem(checklistItemId: string, checked: boolean) {
  const profile = await requireApprovedStudent();
  await prisma.checklistCompletion.upsert({
    where: {
      userId_checklistItemId: {
        userId: profile.id,
        checklistItemId
      }
    },
    create: {
      userId: profile.id,
      checklistItemId,
      checked,
      checkedAt: checked ? new Date() : null
    },
    update: {
      checked,
      checkedAt: checked ? new Date() : null
    }
  });
  revalidatePath("/curso");
}

export async function completeLesson(lessonId: string) {
  const profile = await requireApprovedStudent();
  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: profile.id,
        lessonId
      }
    },
    create: {
      userId: profile.id,
      lessonId,
      completed: true,
      completedAt: new Date()
    },
    update: {
      completed: true,
      completedAt: new Date()
    }
  });
  revalidatePath("/dashboard");
  revalidatePath("/curso");
}

export async function updateModuleStatus(moduleId: string, status: "DRAFT" | "PUBLISHED" | "HIDDEN") {
  await requireAdmin();
  await prisma.module.update({
    where: { id: moduleId },
    data: { status }
  });
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function createBanner(formData: FormData) {
  await requireAdmin();
  const courseIdFromForm = String(formData.get("courseId") || "").trim();
  const course = courseIdFromForm
    ? { id: courseIdFromForm }
    : await prisma.course.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

  if (!course) {
    return;
  }

  const [images, lastBannerOrder, blockOrder] = await Promise.all([
    bannerImageEntries(formData, "banners"),
    prisma.banner.findFirst({
    orderBy: { order: "desc" },
    select: { order: true }
    }),
    nextDashboardBlockOrder(course.id)
  ]);

  await prisma.banner.create({
    data: {
      imageUrl: images[0] || null,
      title: String(formData.get("title") || "").trim() || null,
      subtitle: String(formData.get("subtitle") || "").trim() || null,
      order: lastBannerOrder ? lastBannerOrder.order + 1 : 1,
      status: "ACTIVE",
      ...bannerTargetData(formData),
      images: {
        create: images.map((imageUrl, index) => ({
          imageUrl,
          order: index + 1
        }))
      },
      dashboardBlock: {
        create: {
          courseId: course.id,
          type: "BANNER",
          order: blockOrder
        }
      }
    }
  });

  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function updateBanner(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const removeImageIds = formData.getAll("removeImageIds").map((value) => String(value));
  const newImages = await bannerImageEntries(formData, `banners/${id}`);

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      title: String(formData.get("title") || "").trim() || null,
      subtitle: String(formData.get("subtitle") || "").trim() || null,
      status: String(formData.get("status") || "ACTIVE") as "ACTIVE" | "INACTIVE",
      ...bannerTargetData(formData)
    },
    select: { id: true, dashboardBlock: { select: { courseId: true } } }
  });

  if (removeImageIds.length) {
    await prisma.bannerImage.deleteMany({
      where: { bannerId: id, id: { in: removeImageIds } }
    });
  }

  const currentImages = await prisma.bannerImage.findMany({
    where: { bannerId: id },
    orderBy: { order: "asc" },
    select: { id: true, imageUrl: true, order: true }
  });
  const room = Math.max(0, 3 - currentImages.length);
  const imagesToCreate = newImages.slice(0, room);

  if (imagesToCreate.length) {
    await prisma.bannerImage.createMany({
      data: imagesToCreate.map((imageUrl, index) => ({
        bannerId: id,
        imageUrl,
        order: currentImages.length + index + 1
      }))
    });
  }

  const finalImages = await prisma.bannerImage.findMany({
    where: { bannerId: id },
    orderBy: { order: "asc" },
    select: { id: true, imageUrl: true }
  });

  if (finalImages.length) {
    await prisma.$transaction([
      ...finalImages.map((image, index) =>
        prisma.bannerImage.update({
          where: { id: image.id },
          data: { order: index + 1 }
        })
      )
    ]);
  }

  await prisma.banner.update({
    where: { id },
    data: { imageUrl: finalImages[0]?.imageUrl || null }
  });

  if (banner.dashboardBlock?.courseId) {
    await normalizeDashboardBlockOrders(banner.dashboardBlock.courseId);
  }

  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function updateBannerStatus(bannerId: string, status: "ACTIVE" | "INACTIVE") {
  await requireAdmin();
  await prisma.banner.update({
    where: { id: bannerId },
    data: { status }
  });
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function deleteBanner(bannerId: string) {
  await requireAdmin();
  const banner = await prisma.banner.findUnique({
    where: { id: bannerId },
    select: { dashboardBlock: { select: { courseId: true } } }
  });
  await prisma.banner.delete({
    where: { id: bannerId }
  });
  await normalizeBannerOrders();
  if (banner?.dashboardBlock?.courseId) {
    await normalizeDashboardBlockOrders(banner.dashboardBlock.courseId);
  }
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function reorderBanners(orderedIds: string[]) {
  await requireAdmin();
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.banner.update({
        where: { id },
        data: { order: -1000 - index }
      })
    ),
    ...orderedIds.map((id, index) =>
      prisma.banner.update({
        where: { id },
        data: { order: index + 1 }
      })
    )
  ]);
  await normalizeBannerOrders();
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function reorderDashboardBlocks(courseId: string, orderedIds: string[]) {
  await requireAdmin();
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.dashboardBlock.update({
        where: { id },
        data: { order: -1000 - index }
      })
    ),
    ...orderedIds.map((id, index) =>
      prisma.dashboardBlock.update({
        where: { id },
        data: { order: index + 1 }
      })
    )
  ]);
  await normalizeDashboardBlockOrders(courseId);
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function deleteModule(moduleId: string) {
  await requireAdmin();
  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { categoriaId: true }
  });
  await prisma.module.delete({
    where: { id: moduleId }
  });
  if (moduleRecord) {
    await normalizeModuleOrders(moduleRecord.categoriaId);
  }
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function createCategoria(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") || "");
  const title = String(formData.get("title") || "").trim() || "Nova categoria";
  const description = String(formData.get("description") || "").trim();
  const coverPath = await uploadImageFile(formData.get("coverFile"), "categorias");

  if (!courseId) {
    return;
  }

  const last = await prisma.categoria.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true }
  });
  const blockOrder = await nextDashboardBlockOrder(courseId);

  await prisma.categoria.create({
    data: {
      courseId,
      title,
      description: description || null,
      coverImagePath: coverPath,
      order: last ? last.order + 1 : 1,
      status: "PUBLISHED",
      dashboardBlock: {
        create: {
          courseId,
          type: "CATEGORY",
          order: blockOrder
        }
      }
    }
  });

  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function updateCategoria(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const coverPath = await uploadImageFile(formData.get("coverFile"), `categoria-${id}`);
  const requestedOrder = Math.max(1, Number(formData.get("order") || 999));

  const categoria = await prisma.categoria.update({
    where: { id },
    data: {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || "") || null,
      status: String(formData.get("status") || "PUBLISHED") as "DRAFT" | "PUBLISHED" | "HIDDEN",
      ...(coverPath ? { coverImagePath: coverPath } : {})
    },
    select: { courseId: true }
  });

  const categorias = await prisma.categoria.findMany({
    where: { courseId: categoria.courseId },
    orderBy: { order: "asc" },
    select: { id: true }
  });
  const orderedIds = categorias.map((item) => item.id).filter((itemId) => itemId !== id);
  orderedIds.splice(Math.min(requestedOrder - 1, orderedIds.length), 0, id);
  await prisma.$transaction([
    ...orderedIds.map((itemId, index) =>
      prisma.categoria.update({
        where: { id: itemId },
        data: { order: -1000 - index }
      })
    ),
    ...orderedIds.map((itemId, index) =>
      prisma.categoria.update({
        where: { id: itemId },
        data: { order: index + 1 }
      })
    )
  ]);
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function deleteCategoria(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const mode = String(formData.get("mode") || "move").trim();

  if (!id) {
    return { ok: false, error: "Categoria não encontrada." };
  }

  const categoria = await prisma.categoria.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      courseId: true,
      modules: { select: { id: true }, orderBy: { order: "asc" } }
    }
  });

  if (!categoria) {
    return { ok: false, error: "Categoria não encontrada." };
  }

  try {
    if (mode === "delete") {
      // Cascade removes lessons, blocks, checklists and progress via Prisma relations.
      await prisma.$transaction(async (tx) => {
        await tx.module.deleteMany({ where: { categoriaId: id } });
        await tx.categoria.delete({ where: { id } });
      });
    } else {
      const generalId = await getOrCreateGeneralCategoria(categoria.courseId);
      if (generalId === id) {
        return { ok: false, error: "Não é possível mover a própria categoria Geral." };
      }

      await prisma.$transaction(async (tx) => {
        const lastModule = await tx.module.findFirst({
          where: { categoriaId: generalId },
          orderBy: { order: "desc" },
          select: { order: true }
        });
        let nextOrder = lastModule ? lastModule.order + 1 : 1;

        for (const courseModule of categoria.modules) {
          await tx.module.update({
            where: { id: courseModule.id },
            data: { categoriaId: generalId, order: nextOrder++ }
          });
        }

        await tx.categoria.delete({ where: { id } });
      });

      await normalizeModuleOrders(generalId);
    }

    await normalizeCategoriaOrders(categoria.courseId);
    await normalizeDashboardBlockOrders(categoria.courseId);
    revalidateTag("course-structure");
    revalidatePath("/admin/conteudo");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir a categoria. Tente novamente." };
  }
}

export async function moveModuleToCategoria(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") || "");
  const categoriaId = String(formData.get("categoriaId") || "");

  const [moduleRecord, lastModule] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId }, select: { categoriaId: true } }),
    prisma.module.findFirst({ where: { categoriaId }, orderBy: { order: "desc" }, select: { order: true } })
  ]);

  if (!moduleRecord || !categoriaId) {
    return;
  }

  await prisma.module.update({
    where: { id: moduleId },
    data: {
      categoriaId,
      order: lastModule ? lastModule.order + 1 : 1
    }
  });

  await normalizeModuleOrders(moduleRecord.categoriaId);
  await normalizeModuleOrders(categoriaId);
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath(`/admin/conteudo/${moduleId}`);
  revalidatePath("/dashboard");
}

export async function removeModuleFromCategoria(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") || "");
  const mode = String(formData.get("mode") || "move");
  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true, courseId: true, categoriaId: true }
  });

  if (!moduleRecord) {
    return;
  }

  if (mode === "delete") {
    await prisma.module.delete({ where: { id: moduleId } });
    await normalizeModuleOrders(moduleRecord.categoriaId);
  } else {
    const generalId = await getOrCreateGeneralCategoria(moduleRecord.courseId);
    const lastModule = await prisma.module.findFirst({
      where: { categoriaId: generalId },
      orderBy: { order: "desc" },
      select: { order: true }
    });
    await prisma.module.update({
      where: { id: moduleId },
      data: {
        categoriaId: generalId,
        order: lastModule ? lastModule.order + 1 : 1
      }
    });
    await normalizeModuleOrders(moduleRecord.categoriaId);
    await normalizeModuleOrders(generalId);
  }

  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function reorderCategorias(courseId: string, orderedIds: string[]) {
  await requireAdmin();
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.categoria.update({
        where: { id },
        data: { order: -1000 - index }
      })
    ),
    ...orderedIds.map((id, index) =>
      prisma.categoria.update({
        where: { id },
        data: { order: index + 1 }
      })
    )
  ]);
  await normalizeCategoriaOrders(courseId);
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function reorderModules(categoriaId: string, orderedIds: string[]) {
  await requireAdmin();
  await prisma.$transaction([
    ...orderedIds.map((id, index) =>
      prisma.module.update({
        where: { id },
        data: { order: -1000 - index }
      })
    ),
    ...orderedIds.map((id, index) =>
      prisma.module.update({
        where: { id },
        data: { order: index + 1 }
      })
    )
  ]);
  await normalizeModuleOrders(categoriaId);
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function updateCourseSettings(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const bannerPath = await uploadImageFile(formData.get("bannerFile"), "banners");

  await prisma.course.update({
    where: { id },
    data: {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || "") || null,
      hideText: formData.get("hideText") === "on",
      ...(bannerPath ? { bannerUrl: bannerPath } : {})
    }
  });

  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function createModule(formData: FormData) {
  await requireAdmin();
  const categoriaId = String(formData.get("categoriaId") || "");
  const title = String(formData.get("title") || "").trim();
  const objective = String(formData.get("objective") || "").trim();

  if (!categoriaId) {
    return;
  }

  const categoria = await prisma.categoria.findUnique({
    where: { id: categoriaId },
    select: { courseId: true }
  });

  if (!categoria) {
    return;
  }

  const [moduleCount, lastModule] = await Promise.all([
    prisma.module.count({ where: { courseId: categoria.courseId } }),
    prisma.module.findFirst({
      where: { categoriaId },
      orderBy: { order: "desc" },
      select: { order: true }
    })
  ]);
  const coverPath = await uploadImageFile(formData.get("coverFile"), `modulo-${moduleCount}`);
  const order = lastModule ? lastModule.order + 1 : 1;

  await prisma.module.create({
    data: {
      courseId: categoria.courseId,
      categoriaId,
      number: String(moduleCount),
      title,
      objective: objective || null,
      order,
      status: "PUBLISHED",
      hideText: formData.get("hideText") === "on",
      coverImagePath: coverPath
    }
  });

  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function updateLessonStatus(lessonId: string, status: "DRAFT" | "PUBLISHED" | "HIDDEN") {
  await requireAdmin();
  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: { status },
    select: { moduleId: true }
  });
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath(`/admin/conteudo/${lesson.moduleId}`);
  revalidatePath("/dashboard");
}

export async function deleteLesson(lessonId: string) {
  await requireAdmin();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true }
  });
  await prisma.lesson.delete({
    where: { id: lessonId }
  });
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  if (lesson) {
    revalidatePath(`/admin/conteudo/${lesson.moduleId}`);
  }
  revalidatePath("/dashboard");
}

export async function updateModule(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const currentModule = await prisma.module.findUnique({
    where: { id },
    select: { number: true }
  });
  const coverPath = await uploadImageFile(formData.get("coverFile"), `modulo-${currentModule?.number || id}`);
  const requestedOrder = Math.max(1, Number(formData.get("order") || 999));
  const moduleRecord = await prisma.module.update({
    where: { id },
    data: {
      title: String(formData.get("title") || ""),
      objective: String(formData.get("objective") || ""),
      hideText: formData.get("hideText") === "on",
      ...(coverPath ? { coverImagePath: coverPath } : {})
    },
    select: { categoriaId: true }
  });

  const modules = await prisma.module.findMany({
    where: { categoriaId: moduleRecord.categoriaId },
    orderBy: { order: "asc" },
    select: { id: true }
  });
  const orderedIds = modules.map((item) => item.id).filter((itemId) => itemId !== id);
  orderedIds.splice(Math.min(requestedOrder - 1, orderedIds.length), 0, id);
  await prisma.$transaction([
    ...orderedIds.map((itemId, index) =>
      prisma.module.update({
        where: { id: itemId },
        data: { order: -1000 - index }
      })
    ),
    ...orderedIds.map((itemId, index) =>
      prisma.module.update({
        where: { id: itemId },
        data: { order: index + 1 }
      })
    )
  ]);
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath("/dashboard");
}

export async function updateLesson(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      title: String(formData.get("title") || ""),
      objective: String(formData.get("objective") || ""),
      context: String(formData.get("context") || ""),
      tipKind: String(formData.get("tipKind") || "") || null,
      tipText: String(formData.get("tipText") || "") || null,
      order: Number(formData.get("order") || 999)
    },
    select: { moduleId: true }
  });
  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath(`/admin/conteudo/${lesson.moduleId}`);
  revalidatePath("/dashboard");
}

export async function createLesson(formData: FormData) {
  await requireAdmin();
  const moduleId = String(formData.get("moduleId") || "");
  const title = String(formData.get("title") || "").trim();
  const objective = String(formData.get("objective") || "").trim();
  const context = String(formData.get("context") || "").trim();

  if (!moduleId || !title) {
    return;
  }

  const [lessonCount, lastLesson] = await Promise.all([
    prisma.lesson.count({ where: { moduleId } }),
    prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: "desc" },
      select: { order: true }
    })
  ]);

  await prisma.lesson.create({
    data: {
      moduleId,
      number: String(lessonCount + 1),
      title,
      objective: objective || null,
      context: context || null,
      order: lastLesson ? lastLesson.order + 1 : 1,
      status: "PUBLISHED",
      showAutoTitle: true,
      blocksMigrated: false
    }
  });

  revalidateTag("course-structure");
  revalidatePath("/admin/conteudo");
  revalidatePath(`/admin/conteudo/${moduleId}`);
  revalidatePath("/dashboard");
}

export async function uploadCourseImage(formData: FormData) {
  await requireAdmin();
  const folder = sanitizeStorageName(String(formData.get("folder") || "geral"));
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  await uploadImageToR2(file, folder, { upsert: true });

  revalidateTag("r2-images");
  revalidatePath("/admin/imagens");
}

export async function goToLesson(lessonId: string) {
  redirect(`/curso/${lessonId}`);
}
