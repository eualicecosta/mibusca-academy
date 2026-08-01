import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Shared admin chrome (sidebar + header). Pages only fetch their own data.
 * Keeps navigation shell mounted across /admin/* transitions.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const started = process.env.NODE_ENV === "development" ? performance.now() : 0;
  const profile = await requireAdmin();
  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] admin.layout.requireAdmin ${Math.round(performance.now() - started)}ms`);
  }

  return (
    <AdminShell userName={profile.name} userEmail={profile.email} userImageUrl={profile.imageUrl}>
      {children}
    </AdminShell>
  );
}
