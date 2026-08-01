import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Compatibility redirect: Membros ativos → Clientes ativos */
export default function MembersRedirectPage() {
  redirect("/admin/clientes");
}
