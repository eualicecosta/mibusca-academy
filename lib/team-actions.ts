"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAdminAudit } from "@/lib/audit";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidateTeamPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/equipe");
  revalidatePath("/admin/clientes");
}

export async function inviteTeamMember(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "") as UserRole;

  if (!email || !email.includes("@")) return { ok: false, error: "E-mail invalido" };
  if (role !== "ADMIN" && role !== "SELLER") return { ok: false, error: "Funcao invalida" };

  const existing = await prisma.userProfile.findFirst({
    where: { email, deletedAt: null }
  });
  if (existing) return { ok: false, error: "Ja existe um perfil com este e-mail" };

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

  await writeAdminAudit({
    adminId: admin.id,
    action: "team.invite",
    entityType: "TeamInvite",
    result: "ok",
    meta: { role }
  });

  revalidateTeamPaths();
  return { ok: true, message: "Convite registrado" };
}

export async function updateTeamMemberRole(userId: string, role: UserRole): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (role !== "ADMIN" && role !== "SELLER") return { ok: false, error: "Funcao invalida" };
  if (userId === admin.id && role !== "ADMIN") {
    return { ok: false, error: "Voce nao pode remover a propria funcao de administrador" };
  }

  const target = await prisma.userProfile.findFirst({
    where: { id: userId, role: { in: ["ADMIN", "SELLER"] }, deletedAt: null }
  });
  if (!target) return { ok: false, error: "Membro do time nao encontrado" };

  if (target.role === "ADMIN" && role === "SELLER") {
    const adminCount = await prisma.userProfile.count({
      where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }
    });
    if (adminCount <= 1 && target.status === "ACTIVE") {
      return { ok: false, error: "Nao e permitido rebaixar o ultimo administrador ativo" };
    }
  }

  await prisma.userProfile.update({
    where: { id: userId },
    data: { role }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "team.role.update",
    entityType: "UserProfile",
    entityId: userId,
    result: "ok",
    meta: { role }
  });

  revalidateTeamPaths();
  return { ok: true, message: "Funcao atualizada" };
}

export async function setTeamMemberAccess(userId: string, status: "ACTIVE" | "BLOCKED" | "PAUSED"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id && status !== "ACTIVE") {
    return { ok: false, error: "Voce nao pode pausar ou bloquear a propria conta" };
  }

  const target = await prisma.userProfile.findFirst({
    where: { id: userId, role: { in: ["ADMIN", "SELLER"] }, deletedAt: null }
  });
  if (!target) return { ok: false, error: "Membro nao encontrado" };

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      status,
      blockedAt: status === "BLOCKED" ? new Date() : null,
      blockReason: status === "BLOCKED" ? "Bloqueio administrativo do time" : null
    }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: `team.access.${status.toLowerCase()}`,
    entityType: "UserProfile",
    entityId: userId,
    result: "ok"
  });

  revalidateTeamPaths();
  return { ok: true, message: "Acesso atualizado" };
}

/** Revoke pending Clerk invitation + local TeamInvite row. */
export async function revokeTeamInvite(inviteId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const invite = await prisma.teamInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return { ok: false, error: "Convite nao encontrado" };
  if (invite.status !== "PENDING") return { ok: false, error: "Somente convites pendentes podem ser revogados" };

  if (invite.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.invitations.revokeInvitation(invite.clerkInvitationId);
    } catch {
      // Still mark local as revoked if Clerk already expired/revoked it.
    }
  }

  await prisma.teamInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "team.invite.revoke",
    entityType: "TeamInvite",
    entityId: inviteId,
    result: "ok"
  });

  revalidateTeamPaths();
  return { ok: true, message: "Convite revogado" };
}

export async function resendTeamInvite(inviteId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const invite = await prisma.teamInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.status !== "PENDING") {
    return { ok: false, error: "Convite pendente nao encontrado" };
  }

  try {
    const client = await clerkClient();
    if (invite.clerkInvitationId) {
      try {
        await client.invitations.revokeInvitation(invite.clerkInvitationId);
      } catch {
        // ignore
      }
    }
    const invitation = await client.invitations.createInvitation({
      emailAddress: invite.email,
      redirectUrl: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/sign-up`
        : undefined,
      publicMetadata: { intendedRole: invite.role },
      ignoreExisting: true
    });
    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { clerkInvitationId: invitation.id }
    });
  } catch {
    return { ok: false, error: "Falha ao reenviar convite na Clerk" };
  }

  await writeAdminAudit({
    adminId: admin.id,
    action: "team.invite.resend",
    entityType: "TeamInvite",
    entityId: inviteId,
    result: "ok"
  });

  revalidateTeamPaths();
  return { ok: true, message: "Convite reenviado" };
}
