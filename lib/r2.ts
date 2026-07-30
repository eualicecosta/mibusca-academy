import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

export async function listR2Images(prefixes: string[]) {
  if (!storageUploadReady()) {
    return [];
  }

  const client = getR2Client();
  const bucketName = getR2BucketName();
  const publicBaseUrl = getR2PublicBaseUrl();
  const images: Array<{ path: string; url: string; size?: number }> = [];

  for (const prefix of prefixes) {
    let continuationToken: string | undefined;
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: `${prefix.replace(/^\/+|\/+$/g, "")}/`,
          ContinuationToken: continuationToken
        })
      );

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
  }

  return images;
}
