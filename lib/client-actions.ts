"use server";

import { revalidatePath } from "next/cache";
import type { ApprovalStatus, CommercialStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/admin-labels";

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

function revalidateClientPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/membros");
}

export async function updateClientAccessStatus(userId: string, status: ApprovalStatus, blockReason?: string) {
  await requireAdmin();
  if (!ACCESS.includes(status)) return;

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      status,
      approvedAt: status === "ACTIVE" ? new Date() : undefined,
      blockedAt: status === "BLOCKED" ? new Date() : status === "ACTIVE" || status === "PAUSED" ? null : undefined,
      blockReason: status === "BLOCKED" ? blockReason?.trim() || null : status === "ACTIVE" ? null : undefined,
      commercialStage: status === "ACTIVE" ? "SALE_COMPLETED" : status === "CANCELLED" || status === "REFUSED" ? "SALE_LOST" : undefined
    }
  });
  revalidateClientPaths();
}

export async function updateClientCommercialStage(userId: string, stage: CommercialStage) {
  await requireAdmin();
  if (!STAGES.includes(stage)) return;
  await prisma.userProfile.update({
    where: { id: userId },
    data: { commercialStage: stage }
  });
  revalidateClientPaths();
}

export async function updateClientProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const adminNotes = String(formData.get("adminNotes") || "").trim();
  const stage = String(formData.get("commercialStage") || "") as CommercialStage;
  const status = String(formData.get("status") || "") as ApprovalStatus;
  const paidRaw = String(formData.get("paidAmount") || "").trim();
  const blockReason = String(formData.get("blockReason") || "").trim();

  if (!id || !name) return;

  const paidAmountCents = paidRaw ? parseBRLToCents(paidRaw) : 0;
  if (paidAmountCents === null) return;

  const data: {
    name: string;
    adminNotes: string | null;
    paidAmountCents: number;
    commercialStage?: CommercialStage;
    status?: ApprovalStatus;
    approvedAt?: Date | null;
    blockedAt?: Date | null;
    blockReason?: string | null;
  } = {
    name,
    adminNotes: adminNotes || null,
    paidAmountCents
  };

  if (STAGES.includes(stage)) data.commercialStage = stage;
  if (ACCESS.includes(status)) {
    data.status = status;
    if (status === "ACTIVE") {
      data.approvedAt = new Date();
      data.blockedAt = null;
      data.blockReason = null;
      data.commercialStage = data.commercialStage || "SALE_COMPLETED";
    }
    if (status === "BLOCKED") {
      data.blockedAt = new Date();
      data.blockReason = blockReason || null;
    }
    if (status === "CANCELLED" || status === "REFUSED") {
      data.commercialStage = data.commercialStage || "SALE_LOST";
    }
  }

  await prisma.userProfile.update({ where: { id }, data });
  revalidateClientPaths();
}

/** Backwards-compatible wrappers used by older UI bits */
export async function updateUserApproval(userId: string, status: "PENDING" | "ACTIVE" | "REFUSED") {
  await updateClientAccessStatus(userId, status);
}
