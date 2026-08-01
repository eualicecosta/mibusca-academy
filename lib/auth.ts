import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV === "development";

function perfLog(label: string, startedAt: number) {
  if (!isDev) return;
  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Request-scoped profile loader (React cache).
 * Dedupes auth + DB work within a single RSC render.
 * currentUser() is used only for first-time local profile provisioning.
 */
export const getCurrentProfile = cache(async () => {
  const totalStartedAt = isDev ? performance.now() : 0;

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const findStartedAt = isDev ? performance.now() : 0;
  let profile = await prisma.userProfile.findUnique({
    where: { clerkId: userId }
  });
  perfLog("getCurrentProfile.findUnique", findStartedAt);

  if (!profile) {
    // Exceptional path: first local provision only — not on every navigation.
    const clerkStartedAt = isDev ? performance.now() : 0;
    const clerkUser = await currentUser();
    perfLog("getCurrentProfile.currentUser", clerkStartedAt);

    if (!clerkUser) {
      return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk.local`;
    const createStartedAt = isDev ? performance.now() : 0;
    try {
      profile = await prisma.userProfile.create({
        data: {
          clerkId: userId,
          email,
          name: clerkUser.fullName || clerkUser.firstName || email,
          status: "PENDING",
          lastSeenAt: new Date()
        }
      });
      perfLog("getCurrentProfile.create", createStartedAt);
    } catch (error) {
      // Concurrent first requests (or webhook race) can hit unique clerkId.
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      profile = await prisma.userProfile.findUnique({
        where: { clerkId: userId }
      });
      perfLog("getCurrentProfile.createRaceRecover", createStartedAt);

      if (!profile) {
        return null;
      }
    }
  } else {
    const lastSeen = profile.lastSeenAt?.getTime() || 0;
    if (Date.now() - lastSeen > 60_000) {
      const profileId = profile.id;
      // Non-blocking: does not delay the navigation response.
      after(async () => {
        const updateStartedAt = isDev ? performance.now() : 0;
        try {
          await prisma.userProfile.update({
            where: { id: profileId },
            data: { lastSeenAt: new Date() }
          });
          perfLog("getCurrentProfile.lastSeenAt", updateStartedAt);
        } catch {
          // Telemetry only — never fail the user navigation.
          if (isDev) {
            console.info("[perf] getCurrentProfile.lastSeenAt failed (ignored)");
          }
        }
      });
    }
  }

  perfLog("getCurrentProfile.total", totalStartedAt);
  return profile;
});

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
