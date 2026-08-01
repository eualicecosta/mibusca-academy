"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function revalidateTeamPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/equipe");
}

export async function inviteTeamMember(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "") as UserRole;

  if (!email || !email.includes("@")) return { ok: false as const, error: "E-mail invalido" };
  if (role !== "ADMIN" && role !== "SELLER") return { ok: false as const, error: "Funcao invalida" };

  const existing = await prisma.userProfile.findUnique({ where: { email } });
  if (existing) return { ok: false as const, error: "Ja existe um perfil com este e-mail" };

  let clerkInvitationId: string | null = null;
  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/sign-up`
        : undefined,
      publicMetadata: {
        intendedRole: role,
        invitedName: name || undefined
      },
      ignoreExisting: true
    });
    clerkInvitationId = invitation.id;
  } catch {
    // Invitation may fail if already exists in Clerk; still register local intent.
  }

  await prisma.teamInvite.create({
    data: {
      email,
      role,
      clerkInvitationId,
      invitedById: admin.id,
      status: "PENDING"
    }
  });

  revalidateTeamPaths();
  return { ok: true as const };
}

export async function updateTeamMemberRole(userId: string, role: UserRole) {
  const admin = await requireAdmin();
  if (role !== "ADMIN" && role !== "SELLER") return { ok: false as const, error: "Funcao invalida" };
  if (userId === admin.id && role !== "ADMIN") {
    return { ok: false as const, error: "Voce nao pode remover a propria funcao de administrador" };
  }

  const target = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!target || (target.role !== "ADMIN" && target.role !== "SELLER")) {
    return { ok: false as const, error: "Membro do time nao encontrado" };
  }

  if (target.role === "ADMIN" && role === "SELLER") {
    const adminCount = await prisma.userProfile.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (adminCount <= 1 && target.status === "ACTIVE") {
      return { ok: false as const, error: "Nao e permitido rebaixar o ultimo administrador ativo" };
    }
  }

  await prisma.userProfile.update({
    where: { id: userId },
    data: { role }
  });
  revalidateTeamPaths();
  return { ok: true as const };
}

export async function setTeamMemberAccess(userId: string, status: "ACTIVE" | "BLOCKED" | "PAUSED") {
  await requireAdmin();
  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      status,
      blockedAt: status === "BLOCKED" ? new Date() : null,
      blockReason: status === "BLOCKED" ? "Bloqueio administrativo do time" : null
    }
  });
  revalidateTeamPaths();
  return { ok: true as const };
}
