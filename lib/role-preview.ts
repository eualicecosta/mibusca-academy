import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@prisma/client";

export type PreviewRole = "STUDENT" | "SELLER";

const COOKIE_NAME = "mibusca_role_preview";
const MAX_AGE_SEC = 60 * 60 * 4; // 4 hours

function secret() {
  return process.env.ROLE_PREVIEW_SECRET || process.env.CLERK_SECRET_KEY || "dev-role-preview-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(value: { adminId: string; role: PreviewRole; exp: number }) {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string | undefined): { adminId: string; role: PreviewRole; exp: number } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      adminId: string;
      role: PreviewRole;
      exp: number;
    };
    if (!parsed?.adminId || (parsed.role !== "STUDENT" && parsed.role !== "SELLER")) return null;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getRolePreviewCookie(): Promise<{ adminId: string; role: PreviewRole } | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  const parsed = decode(raw);
  if (!parsed) return null;
  return { adminId: parsed.adminId, role: parsed.role };
}

export async function setRolePreviewCookie(adminId: string, role: PreviewRole) {
  const jar = await cookies();
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  jar.set(COOKIE_NAME, encode({ adminId, role, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC
  });
}

export async function clearRolePreviewCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

/** effectiveRole for UI/nav; actual role remains profile.role */
export function resolveEffectiveRole(actualRole: UserRole, preview: { adminId: string; role: PreviewRole } | null, profileId: string): UserRole {
  if (actualRole !== "ADMIN") return actualRole;
  if (!preview || preview.adminId !== profileId) return actualRole;
  return preview.role;
}

export { COOKIE_NAME as ROLE_PREVIEW_COOKIE };
