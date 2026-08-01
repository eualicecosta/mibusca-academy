import { AdminShell } from "@/components/admin-shell";
import { requireAdminUI } from "@/lib/auth";
import { buildWhatsAppUrl, getSupportSettings } from "@/lib/support";

export const dynamic = "force-dynamic";

/**
 * Shared admin chrome (sidebar + header). Pages only fetch their own data.
 * Uses requireAdminUI so role-preview mode cannot open admin routes.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const started = process.env.NODE_ENV === "development" ? performance.now() : 0;
  const profile = await requireAdminUI();
  const support = await getSupportSettings();
  const supportHref =
    support.supportEnabled && support.supportWhatsApp
      ? buildWhatsAppUrl(support.supportWhatsApp, support.supportDefaultMessage)
      : null;
  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] admin.layout.requireAdminUI ${Math.round(performance.now() - started)}ms`);
  }

  return (
    <AdminShell
      userName={profile.name}
      userEmail={profile.email}
      userImageUrl={profile.imageUrl}
      supportHref={supportHref}
    >
      {children}
    </AdminShell>
  );
}
