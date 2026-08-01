"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { clearRolePreviewCookie, setRolePreviewCookie, type PreviewRole } from "@/lib/role-preview";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidateShell() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/vendedor");
  revalidatePath("/admin");
  revalidatePath("/perfil");
  revalidatePath("/curso");
}

export async function setViewAsRole(role: PreviewRole): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN" || profile.status !== "ACTIVE") {
    return { ok: false, error: "Somente administradores podem usar o modo de teste." };
  }
  if (role !== "STUDENT" && role !== "SELLER") {
    return { ok: false, error: "Modo de teste inválido." };
  }
  await setRolePreviewCookie(profile.id, role);
  revalidateShell();
  return { ok: true, message: role === "STUDENT" ? "Visualizando como cliente" : "Visualizando como vendedor" };
}

export async function clearViewAsRole(): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") {
    return { ok: false, error: "Somente administradores podem sair do modo de teste." };
  }
  await clearRolePreviewCookie();
  revalidateShell();
  return { ok: true, message: "Modo administrador restaurado" };
}

export async function setViewAsRoleAndGo(role: PreviewRole) {
  const result = await setViewAsRole(role);
  if (result.ok) {
    redirect(role === "SELLER" ? "/vendedor" : "/dashboard");
  }
  return result;
}

export async function clearViewAsRoleAndGo() {
  const result = await clearViewAsRole();
  if (result.ok) {
    redirect("/admin");
  }
  return result;
}
