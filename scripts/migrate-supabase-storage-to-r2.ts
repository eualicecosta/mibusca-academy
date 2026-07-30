import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { getR2PublicBaseUrl, getSupabaseStorageBaseUrl, isAbsoluteUrl } from "../lib/assets";
import { uploadBufferToR2 } from "../lib/r2";

function loadEnvFile(fileName: string) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "course-images";
const r2PublicBaseUrl = getR2PublicBaseUrl();
const supabaseStorageBaseUrl = getSupabaseStorageBaseUrl();
const writeAbsoluteR2Urls = process.env.MIGRATE_IMAGE_REFERENCES_AS_ABSOLUTE !== "false";

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseStorageBaseUrl) {
  throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_STORAGE_BUCKET para ler as imagens antigas do Supabase.");
}

if (!r2PublicBaseUrl) {
  throw new Error("Configure R2_PUBLIC_BASE_URL antes de atualizar as referencias de imagem para o R2.");
}

const sourceStorageBaseUrl = supabaseStorageBaseUrl;
const targetStorageBaseUrl = r2PublicBaseUrl;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "");
}

function pathFromValue(value: string | null) {
  if (!value) return null;

  if (value.startsWith(`${sourceStorageBaseUrl}/`)) {
    return decodeURIComponent(value.slice(sourceStorageBaseUrl.length + 1));
  }

  if (value.startsWith(`${targetStorageBaseUrl}/`)) {
    return decodeURIComponent(value.slice(targetStorageBaseUrl.length + 1));
  }

  if (isAbsoluteUrl(value)) {
    return null;
  }

  return normalizeStoragePath(value);
}

function migratedValue(value: string | null) {
  const path = pathFromValue(value);
  if (!path) return value;
  return writeAbsoluteR2Urls ? `${targetStorageBaseUrl}/${path}` : path;
}

async function listSupabaseFiles(prefix = ""): Promise<string[]> {
  const { data, error } = await supabase.storage.from(supabaseBucket).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" }
  });

  if (error) {
    throw new Error(`Erro ao listar ${prefix || "raiz"} no Supabase Storage: ${error.message}`);
  }

  const files: string[] = [];
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata) {
      files.push(path);
    } else {
      files.push(...(await listSupabaseFiles(path)));
    }
  }

  return files;
}

async function copySupabaseFileToR2(path: string) {
  const { data, error } = await supabase.storage.from(supabaseBucket).download(path);

  if (error || !data) {
    throw new Error(`Erro ao baixar ${path} do Supabase Storage: ${error?.message || "arquivo vazio"}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  await uploadBufferToR2(path, buffer, data.type || undefined);
}

async function updateImageReferences() {
  let updated = 0;

  for (const course of await prisma.course.findMany({ select: { id: true, bannerUrl: true } })) {
    const next = migratedValue(course.bannerUrl);
    if (next && next !== course.bannerUrl) {
      await prisma.course.update({ where: { id: course.id }, data: { bannerUrl: next } });
      updated++;
    }
  }

  for (const banner of await prisma.banner.findMany({ select: { id: true, imageUrl: true } })) {
    const next = migratedValue(banner.imageUrl);
    if (next && next !== banner.imageUrl) {
      await prisma.banner.update({ where: { id: banner.id }, data: { imageUrl: next } });
      updated++;
    }
  }

  for (const categoria of await prisma.categoria.findMany({ select: { id: true, coverImagePath: true } })) {
    const next = migratedValue(categoria.coverImagePath);
    if (next && next !== categoria.coverImagePath) {
      await prisma.categoria.update({ where: { id: categoria.id }, data: { coverImagePath: next } });
      updated++;
    }
  }

  for (const module of await prisma.module.findMany({ select: { id: true, coverImagePath: true } })) {
    const next = migratedValue(module.coverImagePath);
    if (next && next !== module.coverImagePath) {
      await prisma.module.update({ where: { id: module.id }, data: { coverImagePath: next } });
      updated++;
    }
  }

  for (const lesson of await prisma.lesson.findMany({ select: { id: true, imagePath: true } })) {
    const next = migratedValue(lesson.imagePath);
    if (next && next !== lesson.imagePath) {
      await prisma.lesson.update({ where: { id: lesson.id }, data: { imagePath: next } });
      updated++;
    }
  }

  for (const block of await prisma.contentBlock.findMany({ select: { id: true, imagePath: true } })) {
    const next = migratedValue(block.imagePath);
    if (next && next !== block.imagePath) {
      await prisma.contentBlock.update({ where: { id: block.id }, data: { imagePath: next } });
      updated++;
    }
  }

  return updated;
}

async function main() {
  console.log(`Lendo Supabase Storage: bucket ${supabaseBucket}`);
  const files = await listSupabaseFiles();
  console.log(`Arquivos encontrados: ${files.length}`);

  for (const [index, file] of files.entries()) {
    await copySupabaseFileToR2(file);
    console.log(`[${index + 1}/${files.length}] ${file}`);
  }

  const updatedReferences = await updateImageReferences();
  console.log(`Referencias atualizadas no banco: ${updatedReferences}`);
  console.log("Migracao concluida. Nao apague o Supabase Storage ainda; valide as imagens no app primeiro.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
