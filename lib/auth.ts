import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { User } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV === "development";

function perfLog(label: string, startedAt: number) {
  if (!isDev) return;
  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function resolveClerkEmail(clerkUser: User, userId: string) {
  const primary =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  const email = (primary || `${userId}@clerk.local`).trim().toLowerCase();
  return email || `${userId}@clerk.local`;
}

function resolveClerkName(clerkUser: User, email: string) {
  const full = clerkUser.fullName?.trim();
  if (full) return full;

  const composed = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
  if (composed) return composed;

  const username = clerkUser.username?.trim();
  if (username) return username;

  const local = email.split("@")[0]?.trim();
  return local || "Usuario";
}

/**
 * Request-scoped profile loader (React cache).
 * Dedupes auth + DB work within a single RSC render.
 * currentUser() is used only for first-time local profile provisioning (e.g. Google OAuth).
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
    const clerkStartedAt = isDev ? performance.now() : 0;
    const clerkUser = await currentUser();
    perfLog("getCurrentProfile.currentUser", clerkStartedAt);

    if (!clerkUser) {
      return null;
    }

    const email = resolveClerkEmail(clerkUser, userId);
    const name = resolveClerkName(clerkUser, email);
    const createStartedAt = isDev ? performance.now() : 0;

    try {
      profile = await prisma.userProfile.create({
        data: {
          clerkId: userId,
          email,
          name,
          status: "PENDING",
          lastSeenAt: new Date()
        }
      });
      perfLog("getCurrentProfile.create", createStartedAt);
    } catch (error) {
      // Concurrent first requests / webhook race can hit unique clerkId or email.
      if (!isUniqueConstraintError(error)) {
        console.error("[auth] profile create failed", {
          code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown",
          target: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : undefined
        });
        throw error;
      }

      profile = await prisma.userProfile.findUnique({
        where: { clerkId: userId }
      });

      if (!profile) {
        // Email unique conflict with another clerkId — recover only if same email maps to one row.
        profile = await prisma.userProfile.findUnique({
          where: { email }
        });

        if (profile && profile.clerkId !== userId) {
          // Do not auto-merge identities. Keep login possible with a stable unique email fallback.
          const fallbackEmail = `${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}@clerk.local`;
          try {
            profile = await prisma.userProfile.create({
              data: {
                clerkId: userId,
                email: fallbackEmail,
                name,
                status: "PENDING",
                lastSeenAt: new Date()
              }
            });
          } catch (retryError) {
            if (!isUniqueConstraintError(retryError)) {
              throw retryError;
            }
            profile = await prisma.userProfile.findUnique({
              where: { clerkId: userId }
            });
          }
        }
      }

      perfLog("getCurrentProfile.createRaceRecover", createStartedAt);

      if (!profile) {
        return null;
      }
    }
  } else {
    const lastSeen = profile.lastSeenAt?.getTime() || 0;
    if (Date.now() - lastSeen > 60_000) {
      const profileId = profile.id;
      // Non-blocking telemetry: avoid `after()` edge-cases on some serverless paths.
      void prisma.userProfile
        .update({
          where: { id: profileId },
          data: { lastSeenAt: new Date() }
        })
        .then(() => {
          if (isDev) {
            console.info("[perf] getCurrentProfile.lastSeenAt ok");
          }
        })
        .catch(() => {
          if (isDev) {
            console.info("[perf] getCurrentProfile.lastSeenAt failed (ignored)");
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
