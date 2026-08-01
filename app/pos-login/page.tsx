import { redirect } from "next/navigation";
import { homePathForProfile, requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Post-auth hub: sends each role/status to the correct home without loops. */
export default async function PostLoginPage() {
  const profile = await requireProfile();
  redirect(homePathForProfile(profile));
}
