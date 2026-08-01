"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { writeAdminAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ROLES: UserRole[] = ["STUDENT", "SELLER", "ADMIN"];

function revalidateRolePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/equipe");
  revalidatePath("/dashboard");
  revalidatePath("/vendedor");
  revalidatePath("/perfil");
  revalidatePath("/aguardando-aprovacao");
}

async function ensureNotLastAdmin(targetId: string, nextRole: UserRole) {
  const target = await prisma.userProfile.findFirst({
    where: { id: targetId, deletedAt: null },
    select: { id: true, role: true, status: true }
  });
  if (!target) return { ok: false as const, error: "Usuário não encontrado" };
  if (target.role === "ADMIN" && target.status === "ACTIVE" && nextRole !== "ADMIN") {
    const adminCount = await prisma.userProfile.count({
      where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }
    });
    if (adminCount <= 1) {
      return { ok: false as const, error: "Não é permitido rebaixar o último administrador ativo" };
    }
  }
  return { ok: true as const, target };
}

/** Approve pending registration and assign role in one step. */
export async function approveUserWithRole(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "").trim();
  const role = String(formData.get("role") || "").trim() as UserRole;

  if (!userId) return { ok: false, error: "Usuário obrigatório" };
  if (!ROLES.includes(role)) return { ok: false, error: "Função inválida" };

  const user = await prisma.userProfile.findFirst({
    where: { id: userId, deletedAt: null }
  });
  if (!user) return { ok: false, error: "Cadastro não encontrado" };

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { id: userId },
      data: {
        role,
        status: "ACTIVE",
        approvedAt: user.approvedAt || new Date(),
        blockedAt: null,
        blockReason: null,
        commercialStage: role === "STUDENT" ? "SALE_COMPLETED" : user.commercialStage
      }
    });
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "user.approve_with_role",
    entityType: "UserProfile",
    entityId: userId,
    result: "ok",
    meta: { role }
  });

  revalidateRolePaths();
  return {
    ok: true,
    message:
      role === "ADMIN"
        ? "Aprovado como administrador"
        : role === "SELLER"
          ? "Aprovado como vendedor"
          : "Aprovado como cliente"
  };
}

export async function refuseUser(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const user = await prisma.userProfile.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) return { ok: false, error: "Cadastro não encontrado" };

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      status: "REFUSED",
      commercialStage: "SALE_LOST"
    }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "user.refuse",
    entityType: "UserProfile",
    entityId: userId,
    result: "ok"
  });

  revalidateRolePaths();
  return { ok: true, message: "Cadastro recusado" };
}

/** Change role of any existing user (admin only). */
export async function updateUserRole(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "").trim();
  const role = String(formData.get("role") || "").trim() as UserRole;

  if (!userId) return { ok: false, error: "Usuário obrigatório" };
  if (!ROLES.includes(role)) return { ok: false, error: "Função inválida" };
  if (userId === admin.id && role !== "ADMIN") {
    return { ok: false, error: "Você não pode remover a própria função de administrador" };
  }

  const guard = await ensureNotLastAdmin(userId, role);
  if (!guard.ok) return guard;

  await prisma.userProfile.update({
    where: { id: userId },
    data: { role }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "user.role.update",
    entityType: "UserProfile",
    entityId: userId,
    result: "ok",
    meta: { role, previous: guard.target.role }
  });

  revalidateRolePaths();
  return { ok: true, message: "Função atualizada" };
}
