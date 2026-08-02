import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";
import { getR2PublicBaseUrl, storageUploadReady } from "./assets";

export function getR2BucketName() {
  return process.env.R2_BUCKET_NAME || "";
}

function r2Endpoint() {
  const explicitEndpoint = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "");
  if (explicitEndpoint) return explicitEndpoint;

  const accountId = process.env.R2_ACCOUNT_ID;
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
}

export function getR2Client() {
  const endpoint = r2Endpoint();
  const bucketName = getR2BucketName();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error("Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME para usar o Cloudflare R2.");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

export function sanitizeStorageName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function sanitizeStoragePath(value: string) {
  return value
    .split(/[\\/]+/)
    .map((segment) => sanitizeStorageName(segment))
    .filter(Boolean)
    .join("/");
}

export async function uploadImageToR2(file: File, folder: string, options?: { upsert?: boolean }) {
  if (!storageUploadReady()) {
    throw new Error("Upload de imagens desativado: configure as variaveis do Cloudflare R2 no ambiente.");
  }

  const client = getR2Client();
  const bucketName = getR2BucketName();
  const safeFolder = sanitizeStoragePath(folder || "geral") || "geral";
  const safeName = sanitizeStorageName(file.name || "imagem");
  const path = options?.upsert ? `${safeFolder}/${safeName}` : `${safeFolder}/${Date.now()}-${safeName}`;
  const body = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: path,
      Body: body,
      ContentType: file.type || "application/octet-stream"
    })
  );

  return path;
}

export async function uploadBufferToR2(path: string, body: Buffer, contentType?: string) {
  const client = getR2Client();
  const bucketName = getR2BucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: path.replace(/^\/+/, ""),
      Body: body,
      ContentType: contentType || "application/octet-stream"
    })
  );
}

export type R2ImageListItem = {
  path: string;
  url: string;
  size?: number;
};

const isDev = process.env.NODE_ENV === "development";

function perfLog(label: string, startedAt: number, extra?: string) {
  if (!isDev) return;
  const suffix = extra ? ` ${extra}` : "";
  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms${suffix}`);
}

/** Limited concurrency for R2 list calls — avoids sequential waterfall without unbounded fan-out. */
async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function listPrefixImages(
  client: S3Client,
  bucketName: string,
  publicBaseUrl: string | null,
  prefix: string
): Promise<R2ImageListItem[]> {
  const startedAt = isDev ? performance.now() : 0;
  const images: R2ImageListItem[] = [];
  let continuationToken: string | undefined;
  let pages = 0;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${prefix.replace(/^\/+|\/+$/g, "")}/`,
        ContinuationToken: continuationToken,
        MaxKeys: 200
      })
    );
    pages += 1;

    for (const object of response.Contents || []) {
      if (!object.Key || object.Key.endsWith("/")) continue;
      const path = object.Key;
      images.push({
        path,
        url: publicBaseUrl ? `${publicBaseUrl}/${path}` : path,
        size: object.Size
      });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  perfLog("listR2Images.prefix", startedAt, `prefix=${prefix} items=${images.length} pages=${pages}`);
  return images;
}

async function listR2ImagesUncached(prefixes: string[]): Promise<R2ImageListItem[]> {
  if (!storageUploadReady()) {
    return [];
  }

  const totalStartedAt = isDev ? performance.now() : 0;
  const client = getR2Client();
  const bucketName = getR2BucketName();
  const publicBaseUrl = getR2PublicBaseUrl();

  // Controlled parallelism (not unbounded, not fully sequential).
  const perPrefix = await mapWithConcurrency(prefixes, 4, (prefix) =>
    listPrefixImages(client, bucketName, publicBaseUrl, prefix)
  );

  const images = perPrefix.flat();
  perfLog("listR2Images.total", totalStartedAt, `prefixes=${prefixes.length} items=${images.length}`);
  return images;
}

/**
 * Short-lived shared cache for admin image browser.
 * Invalidated via revalidateTag("r2-images") after upload.
 */
export async function listR2Images(prefixes: string[]): Promise<R2ImageListItem[]> {
  const key = prefixes.join("|");
  const cached = unstable_cache(() => listR2ImagesUncached(prefixes), ["r2-image-list", key], {
    revalidate: 60,
    tags: ["r2-images"]
  });

  try {
    return await cached();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return listR2ImagesUncached(prefixes);
    }
    throw error;
  }
}

export async function deleteR2Object(path: string) {
  if (!storageUploadReady()) {
    throw new Error("R2 não configurado.");
  }
  const key = path.replace(/^\/+/, "").replace(/^https?:\/\/[^/]+\//, "");
  if (!key || key.includes("..")) {
    throw new Error("Caminho de objeto inválido.");
  }
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: key
    })
  );
}
