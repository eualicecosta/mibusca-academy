// Inventory + optional cleanup of promotional banners and covers.
// Preserves educational lesson images under modulo folders.
// Usage: npx tsx scripts/cleanup-content-images.ts --dry-run | --execute

import { PrismaClient } from "@prisma/client";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");

const BANNER_PREFIXES = ["banner", "banners", "geral", "categorias"];

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const bucket = process.env.R2_BUCKET_NAME || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey }
    }),
    bucket
  };
}

function toKey(path: string) {
  return path.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/+/, "");
}

async function listAllKeys(client: S3Client, bucket: string, prefix: string) {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${prefix.replace(/^\/+|\/+$/g, "")}/`,
        ContinuationToken: token,
        MaxKeys: 200
      })
    );
    for (const obj of res.Contents || []) {
      if (obj.Key && !obj.Key.endsWith("/")) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function main() {
  console.log(execute ? "=== EXECUTE MODE ===" : "=== DRY-RUN ===");

  const courses = await prisma.course.findMany({ select: { id: true, bannerUrl: true, title: true } });
  const banners = await prisma.banner.findMany({
    select: { id: true, imageUrl: true, title: true, images: { select: { id: true, imageUrl: true } } }
  });
  const modules = await prisma.module.findMany({
    select: { id: true, coverImagePath: true, title: true }
  });

  console.log("\nCourse banners:", courses.filter((c) => c.bannerUrl).length);
  for (const c of courses) {
    if (c.bannerUrl) console.log(`- Course ${c.id}: ${c.bannerUrl}`);
  }
  console.log("Dashboard banners:", banners.length);
  for (const b of banners) {
    console.log(`- Banner ${b.id} (${b.title || "sem título"}): ${b.imageUrl || "(sem imageUrl)"} + ${b.images.length} images`);
  }
  console.log("Module covers:", modules.filter((m) => m.coverImagePath).length);

  const r2 = r2Client();
  const r2BannerKeys: string[] = [];
  if (r2) {
    for (const prefix of BANNER_PREFIXES) {
      r2BannerKeys.push(...(await listAllKeys(r2.client, r2.bucket, prefix)));
    }
    console.log(`\nR2 banner/geral/categoria keys: ${r2BannerKeys.length}`);
    for (const k of r2BannerKeys.slice(0, 30)) console.log(`- ${k}`);
  } else {
    console.log("\nR2 env not available in this shell — DB cleanup still possible.");
  }

  if (!execute) {
    console.log("\nWill clear: Course.bannerUrl, Banner images, Module covers.");
    console.log("Will NOT clear: Lesson.imagePath / ContentBlock educational images under modulo-*.");
    console.log("Re-run with --execute to apply.");
    return;
  }

  // Clear promotional/test surfaces that showed "Seleta Comunidade" and similar banners.
  await prisma.course.updateMany({ data: { bannerUrl: null } });
  await prisma.bannerImage.deleteMany({});
  await prisma.banner.updateMany({ data: { imageUrl: null } });
  await prisma.module.updateMany({ data: { coverImagePath: null } });
  console.log("DB: course banner, dashboard banners and module covers cleared.");

  if (r2) {
    const keysToDelete = new Set(r2BannerKeys);
    // Also delete keys referenced by former course/banner URLs if under banner prefixes.
    for (const c of courses) {
      if (c.bannerUrl) keysToDelete.add(toKey(c.bannerUrl));
    }
    for (const b of banners) {
      if (b.imageUrl) keysToDelete.add(toKey(b.imageUrl));
      for (const img of b.images) keysToDelete.add(toKey(img.imageUrl));
    }
    let deleted = 0;
    for (const key of keysToDelete) {
      if (!key || key.startsWith("modulo-")) continue; // protect lesson assets
      try {
        await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
        deleted += 1;
      } catch {
        // ignore missing keys
      }
    }
    console.log(`R2 objects deleted (banner/geral/categoria): ${deleted}`);
  }

  console.log("Done. Redeploy / revalidate to refresh caches.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
