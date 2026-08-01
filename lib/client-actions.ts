"use server";

import { revalidatePath } from "next/cache";
import type { ApprovalStatus, CommercialStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/admin-labels";
import { writeAdminAudit } from "@/lib/audit";

const ACCESS: ApprovalStatus[] = ["PENDING", "ACTIVE", "REFUSED", "PAUSED", "CANCELLED", "BLOCKED"];
const STAGES: CommercialStage[] = [
  "NEW_LEAD",
  "CONTACT_MADE",
  "AWAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "AWAITING_REGISTRATION",
  "AWAITING_APPROVAL",
  "SALE_COMPLETED",
  "SALE_LOST"
];

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidateClientPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/membros");
  revalidatePath("/admin/equipe");
}

async function assertStudentClient(id: string) {
  const client = await prisma.userProfile.findFirst({
    where: { id, role: "STUDENT", deletedAt: null }
  });
  return client;
}

export async function updateClientAccessStatus(
  userId: string,
  status: ApprovalStatus,
  blockReason?: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!ACCESS.includes(status)) return { ok: false, error: "Status invalido" };

  const target = await assertStudentClient(userId);
  if (!target) return { ok: false, error: "Cliente nao encontrado" };

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      status,
      approvedAt: status === "ACTIVE" ? target.approvedAt || new Date() : target.approvedAt,
      blockedAt: status === "BLOCKED" ? new Date() : status === "ACTIVE" || status === "PAUSED" ? null : target.blockedAt,
      blockReason:
        status === "BLOCKED" ? blockReason?.trim() || "Bloqueio administrativo" : status === "ACTIVE" || status === "PAUSED" ? null : target.blockReason
    }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: `client.access.${status.toLowerCase()}`,
    entityType: "UserProfile",
    entityId: userId,
    result: "ok"
  });

  revalidateClientPaths();
  return { ok: true, message: "Status de acesso atualizado" };
}

export async function updateClientCommercialStage(userId: string, stage: CommercialStage): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!STAGES.includes(stage)) return { ok: false, error: "Etapa invalida" };
  const target = await assertStudentClient(userId);
  if (!target) return { ok: false, error: "Cliente nao encontrado" };

  await prisma.userProfile.update({
    where: { id: userId },
    data: { commercialStage: stage }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "client.stage.update",
    entityType: "UserProfile",
    entityId: userId,
    result: "ok",
    meta: { stage }
  });

  revalidateClientPaths();
  return { ok: true };
}

export async function updateClientProfile(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const adminNotes = String(formData.get("adminNotes") || "").trim();
  const stage = String(formData.get("commercialStage") || "") as CommercialStage;
  const status = String(formData.get("status") || "") as ApprovalStatus;
  const paidRaw = String(formData.get("paidAmount") || "").trim();
  const blockReason = String(formData.get("blockReason") || "").trim();
  const sellerIdRaw = String(formData.get("sellerId") || "").trim();

  if (!id || !name) return { ok: false, error: "Nome e obrigatorio" };

  const target = await assertStudentClient(id);
  if (!target) return { ok: false, error: "Cliente nao encontrado" };

  const paidAmountCents = paidRaw ? parseBRLToCents(paidRaw) : 0;
  if (paidAmountCents === null) return { ok: false, error: "Valor pago invalido" };

  let sellerId: string | null = null;
  if (sellerIdRaw) {
    const seller = await prisma.userProfile.findFirst({
      where: { id: sellerIdRaw, role: "SELLER", status: "ACTIVE", deletedAt: null },
      select: { id: true }
    });
    if (!seller) return { ok: false, error: "Vendedor invalido" };
    sellerId = seller.id;
  }

  const data: {
    name: string;
    adminNotes: string | null;
    paidAmountCents: number;
    sellerId: string | null;
    commercialStage?: CommercialStage;
    status?: ApprovalStatus;
    approvedAt?: Date | null;
    blockedAt?: Date | null;
    blockReason?: string | null;
  } = {
    name,
    adminNotes: adminNotes || null,
    paidAmountCents,
    sellerId
  };

  if (STAGES.includes(stage)) data.commercialStage = stage;
  if (ACCESS.includes(status)) {
    data.status = status;
    if (status === "ACTIVE") {
      data.approvedAt = target.approvedAt || new Date();
      data.blockedAt = null;
      data.blockReason = null;
    }
    if (status === "BLOCKED") {
      data.blockedAt = new Date();
      data.blockReason = blockReason || "Bloqueio administrativo";
    }
    if (status === "PAUSED") {
      data.blockedAt = null;
      data.blockReason = null;
    }
  }

  await prisma.userProfile.update({ where: { id }, data });

  await writeAdminAudit({
    adminId: admin.id,
    action: "client.profile.update",
    entityType: "UserProfile",
    entityId: id,
    result: "ok"
  });

  revalidateClientPaths();
  return { ok: true, message: "Cliente atualizado" };
}

/** Mark client as paid: create Sale + associate seller + activate access (transactional). */
export async function markClientAsPaid(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const clientId = String(formData.get("clientId") || "");
  const sellerIdRaw = String(formData.get("sellerId") || "").trim();
  const paidRaw = String(formData.get("paidAmount") || "").trim();
  const soldAtRaw = String(formData.get("soldAt") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!clientId) return { ok: false, error: "Cliente obrigatorio" };

  const amountInCents = parseBRLToCents(paidRaw);
  if (amountInCents === null || amountInCents <= 0) return { ok: false, error: "Informe um valor pago valido" };

  const client = await assertStudentClient(clientId);
  if (!client) return { ok: false, error: "Cliente nao encontrado" };

  let sellerId: string | null = sellerIdRaw || client.sellerId || null;
  if (sellerId) {
    const seller = await prisma.userProfile.findFirst({
      where: { id: sellerId, role: "SELLER", deletedAt: null },
      select: { id: true }
    });
    if (!seller) return { ok: false, error: "Vendedor invalido" };
    sellerId = seller.id;
  }

  const soldAt = soldAtRaw ? new Date(soldAtRaw) : new Date();
  if (Number.isNaN(soldAt.getTime())) return { ok: false, error: "Data da venda invalida" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          clientId,
          sellerId,
          amountInCents,
          status: "CONFIRMED",
          soldAt,
          notes: notes || null,
          createdByAdminId: admin.id
        }
      });

      await tx.userProfile.update({
        where: { id: clientId },
        data: {
          paidAmountCents: amountInCents,
          sellerId,
          status: "ACTIVE",
          commercialStage: "SALE_COMPLETED",
          approvedAt: client.approvedAt || soldAt,
          blockedAt: null,
          blockReason: null
        }
      });
    });
  } catch {
    await writeAdminAudit({
      adminId: admin.id,
      action: "client.mark_paid",
      entityType: "UserProfile",
      entityId: clientId,
      result: "error"
    });
    return { ok: false, error: "Falha ao registrar pagamento" };
  }

  await writeAdminAudit({
    adminId: admin.id,
    action: "client.mark_paid",
    entityType: "UserProfile",
    entityId: clientId,
    result: "ok",
    meta: { amountInCents }
  });

  revalidateClientPaths();
  return { ok: true, message: "Pagamento registrado e acesso ativado" };
}

/** Soft-archive client (preferred over hard delete). */
export async function archiveClient(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const confirm = String(formData.get("confirm") || "").trim();

  const client = await assertStudentClient(id);
  if (!client) return { ok: false, error: "Cliente nao encontrado" };

  const expectedEmail = client.email.toLowerCase();
  if (confirm !== expectedEmail && confirm.toUpperCase() !== "EXCLUIR") {
    return { ok: false, error: "Digite o e-mail do cliente ou a palavra EXCLUIR para confirmar" };
  }

  await prisma.userProfile.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "CANCELLED",
      commercialStage: "SALE_LOST"
    }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "client.archive",
    entityType: "UserProfile",
    entityId: id,
    result: "ok"
  });

  revalidateClientPaths();
  return { ok: true, message: "Cliente arquivado" };
}

/** Launch a sale attributed to a seller (admin-only). */
export async function createSaleForSeller(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const sellerId = String(formData.get("sellerId") || "").trim();
  const clientId = String(formData.get("clientId") || "").trim();
  const paidRaw = String(formData.get("paidAmount") || "").trim();
  const soldAtRaw = String(formData.get("soldAt") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const statusRaw = String(formData.get("status") || "CONFIRMED").trim().toUpperCase();

  if (!sellerId || !clientId) return { ok: false, error: "Cliente e vendedor sao obrigatorios" };

  const amountInCents = parseBRLToCents(paidRaw);
  if (amountInCents === null || amountInCents <= 0) return { ok: false, error: "Valor invalido" };

  const seller = await prisma.userProfile.findFirst({
    where: { id: sellerId, role: "SELLER", deletedAt: null },
    select: { id: true }
  });
  if (!seller) return { ok: false, error: "Vendedor nao encontrado" };

  const client = await assertStudentClient(clientId);
  if (!client) return { ok: false, error: "Cliente nao encontrado" };

  const soldAt = soldAtRaw ? new Date(soldAtRaw) : new Date();
  if (Number.isNaN(soldAt.getTime())) return { ok: false, error: "Data invalida" };

  const saleStatus = statusRaw === "PENDING" ? "PENDING" : statusRaw === "CANCELLED" ? "CANCELLED" : "CONFIRMED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          clientId,
          sellerId,
          amountInCents,
          status: saleStatus,
          soldAt,
          notes: notes || null,
          createdByAdminId: admin.id
        }
      });

      if (saleStatus === "CONFIRMED") {
        await tx.userProfile.update({
          where: { id: clientId },
          data: {
            sellerId,
            paidAmountCents: amountInCents,
            status: "ACTIVE",
            commercialStage: "SALE_COMPLETED",
            approvedAt: client.approvedAt || soldAt,
            blockedAt: null,
            blockReason: null
          }
        });
      } else {
        await tx.userProfile.update({
          where: { id: clientId },
          data: { sellerId }
        });
      }
    });
  } catch {
    return { ok: false, error: "Falha ao lancar venda" };
  }

  await writeAdminAudit({
    adminId: admin.id,
    action: "sale.create",
    entityType: "Sale",
    entityId: clientId,
    result: "ok",
    meta: { amountInCents, sellerId }
  });

  revalidateClientPaths();
  return { ok: true, message: "Venda registrada" };
}

/** Backwards-compatible wrappers used by older UI bits */
export async function updateUserApproval(userId: string, status: "PENDING" | "ACTIVE" | "REFUSED") {
  return updateClientAccessStatus(userId, status);
}
