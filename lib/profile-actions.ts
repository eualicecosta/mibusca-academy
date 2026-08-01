"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidateProfilePaths() {
  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/curso");
}

/** Update display name in Clerk + local profile. */
export async function updateOwnName(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const name = String(formData.get("name") || "").trim();
  if (!name || name.length < 2) return { ok: false, error: "Informe um nome valido" };
  if (name.length > 120) return { ok: false, error: "Nome muito longo" };

  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(" ") || undefined;

  try {
    const client = await clerkClient();
    await client.users.updateUser(profile.clerkId, {
      firstName,
      lastName: lastName || ""
    });
  } catch {
    return { ok: false, error: "Falha ao atualizar nome na Clerk" };
  }

  try {
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { name }
    });
  } catch {
    return { ok: false, error: "Nome atualizado na Clerk, mas falhou no perfil local. Tente novamente." };
  }

  revalidateProfilePaths();
  return { ok: true, message: "Nome atualizado" };
}

/** Cache Clerk image URL after client-side upload. */
export async function syncOwnImageUrl(imageUrl: string | null): Promise<ActionResult> {
  const profile = await requireProfile();
  const url = imageUrl?.trim() || null;
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "URL de imagem invalida" };
  }

  await prisma.userProfile.update({
    where: { id: profile.id },
    data: { imageUrl: url }
  });

  revalidateProfilePaths();
  return { ok: true, message: "Foto sincronizada" };
}
