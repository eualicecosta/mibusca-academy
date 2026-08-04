export function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function cleanBaseUrl(value?: string | null) {
  return value?.trim().replace(/\/+$/, "") || null;
}

export function getR2PublicBaseUrl() {
  // Prefer public env for client components; fall back to server-only R2 URL.
  return cleanBaseUrl(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL);
}

export function getSupabaseStorageBaseUrl() {
  const supabaseUrl = cleanBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseUrl) return null;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-images";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}`;
}

export function resolveAssetUrl(path?: string | null) {
  if (!path) return null;
  if (isAbsoluteUrl(path)) return path;

  const baseUrl = getR2PublicBaseUrl() || getSupabaseStorageBaseUrl();
  return baseUrl ? `${baseUrl}/${path.replace(/^\/+/, "")}` : null;
}

export function storageUploadReady() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL
  );
}
