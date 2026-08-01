import type { ApprovalStatus, CommercialStage, UserRole } from "@prisma/client";

export function formatBRLFromCents(cents: number) {
  const value = (Number.isFinite(cents) ? cents : 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBRLToCents(input: string) {
  const cleaned = input
    .trim()
    .replace(/[R$\s]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export const ACCESS_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "Aguardando aprovacao",
  ACTIVE: "Ativo",
  REFUSED: "Recusado",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
  BLOCKED: "Bloqueado"
};

export const COMMERCIAL_STAGE_LABELS: Record<CommercialStage, string> = {
  NEW_LEAD: "Novo lead",
  CONTACT_MADE: "Contato realizado",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  AWAITING_REGISTRATION: "Aguardando cadastro",
  AWAITING_APPROVAL: "Aguardando aprovacao",
  SALE_COMPLETED: "Venda concluida",
  SALE_LOST: "Venda perdida"
};

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Cliente",
  ADMIN: "Administrador",
  SELLER: "Vendedor"
};

export function isClientRole(role: UserRole) {
  return role === "STUDENT";
}

export function isTeamRole(role: UserRole) {
  return role === "ADMIN" || role === "SELLER";
}
