import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type SupportConfig = {
  supportName: string;
  supportWhatsApp: string;
  supportDefaultMessage: string;
  supportEmail: string | null;
  supportBusinessHours: string | null;
  supportEnabled: boolean;
};

const DEFAULTS: SupportConfig = {
  supportName: "Suporte MiBusca Academy",
  supportWhatsApp: "",
  supportDefaultMessage: "Olá! Preciso de ajuda com meu acesso ao MiBusca Academy.",
  supportEmail: null,
  supportBusinessHours: null,
  supportEnabled: true
};

export function digitsOnlyPhone(input: string) {
  return input.replace(/\D/g, "");
}

export function buildWhatsAppUrl(phoneRaw: string, message: string) {
  const phone = digitsOnlyPhone(phoneRaw);
  if (!phone || phone.length < 10) return null;
  const text = encodeURIComponent((message || DEFAULTS.supportDefaultMessage).trim().slice(0, 500));
  return `https://wa.me/${phone}?text=${text}`;
}

async function loadSupportSettings(): Promise<SupportConfig> {
  try {
    const row = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    if (!row) return DEFAULTS;
    return {
      supportName: row.supportName,
      supportWhatsApp: row.supportWhatsApp,
      supportDefaultMessage: row.supportDefaultMessage,
      supportEmail: row.supportEmail,
      supportBusinessHours: row.supportBusinessHours,
      supportEnabled: row.supportEnabled
    };
  } catch {
    return DEFAULTS;
  }
}

export function getSupportSettings() {
  return unstable_cache(loadSupportSettings, ["system-settings-support-v1"], {
    revalidate: 60,
    tags: ["system-settings"]
  })();
}

export function revalidateSupportSettings() {
  revalidateTag("system-settings");
  revalidatePath("/");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/perfil");
  revalidatePath("/aguardando-aprovacao");
  revalidatePath("/dashboard");
  revalidatePath("/vendedor");
  revalidatePath("/admin");
}

export const STATUS_SUPPORT_MESSAGES: Record<string, string> = {
  PENDING: "Olá! Preciso de ajuda: meu cadastro está aguardando aprovação no MiBusca Academy.",
  PAUSED: "Olá! Preciso de ajuda: meu acesso está temporariamente pausado no MiBusca Academy.",
  BLOCKED: "Olá! Preciso de ajuda: meu acesso está bloqueado no MiBusca Academy.",
  CANCELLED: "Olá! Preciso de ajuda: meu acesso foi cancelado no MiBusca Academy.",
  REFUSED: "Olá! Preciso de ajuda: meu cadastro não foi aprovado no MiBusca Academy.",
  DEFAULT: "Olá! Preciso de ajuda com meu acesso ao MiBusca Academy."
};
