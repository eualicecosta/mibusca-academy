"use server";

import { prisma } from "@/lib/prisma";

/** Minimal admin audit — never store passwords, tokens, or secrets. */
export async function writeAdminAudit(input: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  result: "ok" | "error";
  meta?: Record<string, string | number | boolean | null | undefined>;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        result: input.result,
        meta: input.meta ? JSON.stringify(input.meta) : null
      }
    });
  } catch {
    // Audit must never break primary admin flows.
  }
}
