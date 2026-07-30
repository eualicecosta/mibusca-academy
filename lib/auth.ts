import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function getCurrentProfile() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  let profile = await prisma.userProfile.findUnique({
    where: { clerkId: userId }
  });

  if (!profile) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk.local`;
    profile = await prisma.userProfile.create({
      data: {
        clerkId: userId,
        email,
        name: clerkUser.fullName || clerkUser.firstName || email,
        status: "PENDING"
      }
    });
  }

  return profile;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/sign-in");
  }
  return profile;
}

export async function requireApprovedStudent() {
  const profile = await requireProfile();
  if (profile.role === "ADMIN") {
    redirect("/admin");
  }
  if (profile.status !== "ACTIVE") {
    redirect("/aguardando-aprovacao");
  }
  return profile;
}

export async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return profile;
}
