import { Suspense } from "react";
import { Upload } from "lucide-react";
import Image from "next/image";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadCourseImage } from "@/lib/actions";
import { storageUploadReady } from "@/lib/assets";
import { requireAdmin } from "@/lib/auth";
import { getR2BucketName, listR2Images } from "@/lib/r2";

export const dynamic = "force-dynamic";

const imageFolders = ["geral", "banners", "categorias", ...Array.from({ length: 30 }, (_, index) => `modulo-${index}`)];

const isDev = process.env.NODE_ENV === "development";

export default async function AdminImagesPage() {
  const authStartedAt = isDev ? performance.now() : 0;
  const profile = await requireAdmin();
  if (isDev) {
    console.info(`[perf] admin.imagens.requireAdmin ${Math.round(performance.now() - authStartedAt)}ms`);
  }

  const uploadReady = storageUploadReady();
  const bucketName = getR2BucketName();

  return (
    <AdminShell userName={profile.name} userEmail={profile.email}>
      <div className="mx-auto grid min-w-0 max-w-6xl gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Enviar imagem</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={uploadCourseImage} className="space-y-4">
              <label className="grid gap-2 text-sm text-white/65">
                Pasta
                <select name="folder" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white">
                  {imageFolders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-white/65">
                Arquivo
                <input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white" />
              </label>
              <Button type="submit" disabled={!uploadReady}>
                <Upload className="h-4 w-4" /> Enviar
              </Button>
              {!uploadReady ? <p className="text-sm text-amber-200/80">Configure as variaveis do Cloudflare R2 para ativar uploads.</p> : null}
            </form>
          </CardContent>
        </Card>

        <section className="min-w-0">
          <header className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Cloudflare R2</p>
            <h1 className="mt-2 break-words text-4xl font-bold">Banco de imagens</h1>
            <p className="mt-3 break-all text-white/62">Bucket: {bucketName || "nao configurado"}</p>
          </header>
          <Suspense fallback={<ImagesGridSkeleton />}>
            <ImagesGrid />
          </Suspense>
        </section>
      </div>
    </AdminShell>
  );
}

async function ImagesGrid() {
  const startedAt = isDev ? performance.now() : 0;
  let images: Awaited<ReturnType<typeof listR2Images>> = [];
  try {
    images = await listR2Images(imageFolders);
  } catch {
    images = [];
  }
  if (isDev) {
    console.info(`[perf] admin.imagens.list ${Math.round(performance.now() - startedAt)}ms count=${images.length}`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => (
        <Card key={image.path}>
          <CardContent className="p-3">
            <Image
              src={image.url}
              alt={image.path}
              width={640}
              height={360}
              sizes="(min-width: 1280px) 280px, (min-width: 768px) 50vw, 100vw"
              className="aspect-video w-full rounded-lg object-cover"
            />
            <p className="mt-3 break-all text-sm text-white/72">{image.path}</p>
          </CardContent>
        </Card>
      ))}
      {!images.length ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-white/65">Nenhuma imagem listada. Confira as variaveis do Cloudflare R2 e o bucket.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ImagesGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Carregando imagens">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="aspect-video animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
  );
}
