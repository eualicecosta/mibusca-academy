"use server";

import { requireAdmin } from "@/lib/auth";
import { writeAdminAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { digitsOnlyPhone, revalidateSupportSettings } from "@/lib/support";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function updateSupportSettings(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const supportName = String(formData.get("supportName") || "").trim().slice(0, 120);
  const supportWhatsAppRaw = String(formData.get("supportWhatsApp") || "").trim().slice(0, 40);
  const supportDefaultMessage = String(formData.get("supportDefaultMessage") || "").trim().slice(0, 500);
  const supportEmail = String(formData.get("supportEmail") || "").trim().slice(0, 160) || null;
  const supportBusinessHours = String(formData.get("supportBusinessHours") || "").trim().slice(0, 200) || null;
  const supportEnabled = formData.get("supportEnabled") === "on" || formData.get("supportEnabled") === "true";

  if (!supportName) return { ok: false, error: "Informe o nome do suporte." };

  const digits = digitsOnlyPhone(supportWhatsAppRaw);
  if (supportEnabled && supportWhatsAppRaw && digits.length < 10) {
    return { ok: false, error: "Número de WhatsApp inválido. Inclua DDI e DDD." };
  }
  if (supportEmail && !supportEmail.includes("@")) {
    return { ok: false, error: "E-mail de suporte inválido." };
  }

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      supportName,
      supportWhatsApp: supportWhatsAppRaw,
      supportDefaultMessage: supportDefaultMessage || "Olá! Preciso de ajuda com meu acesso ao MiBusca Academy.",
      supportEmail,
      supportBusinessHours,
      supportEnabled,
      updatedById: admin.id
    },
    update: {
      supportName,
      supportWhatsApp: supportWhatsAppRaw,
      supportDefaultMessage: supportDefaultMessage || "Olá! Preciso de ajuda com meu acesso ao MiBusca Academy.",
      supportEmail,
      supportBusinessHours,
      supportEnabled,
      updatedById: admin.id
    }
  });

  await writeAdminAudit({
    adminId: admin.id,
    action: "settings.support.update",
    entityType: "SystemSettings",
    entityId: "default",
    result: "ok"
  });

  revalidateSupportSettings();
  return { ok: true, message: "Configurações de suporte salvas" };
}
