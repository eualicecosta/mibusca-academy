import { Upload } from "lucide-react";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadCourseImage } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdmin, storageBucket } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function listImages() {
  try {
    const supabase = getSupabaseAdmin();
    const folders = ["geral", ...Array.from({ length: 10 }, (_, index) => `modulo-${index}`)];
    const results = await Promise.all(
      folders.map(async (folder) => {
        const { data } = await supabase.storage.from(storageBucket).list(folder);
        return (data || []).map((file) => {
          const path = `${folder}/${file.name}`;
          const { data: publicUrl } = supabase.storage.from(storageBucket).getPublicUrl(path);
          return { path, url: publicUrl.publicUrl, size: file.metadata?.size as number | undefined };
        });
      })
    );
    return results.flat();
  } catch {
    return [];
  }
}

export default async function AdminImagesPage() {
  const profile = await requireAdmin();
  const images = await listImages();
  const folders = ["geral", ...Array.from({ length: 10 }, (_, index) => `modulo-${index}`)];

  return (
    <AppShell showAdmin={profile.role === "ADMIN"}>
      <div className="mx-auto grid min-w-0 max-w-6xl gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Enviar imagem</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={uploadCourseImage} className="space-y-4">
              <label className="grid gap-2 text-sm text-white/65">Pasta
                <select name="folder" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white">
                  {folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-white/65">Arquivo
                <input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white" />
              </label>
              <Button type="submit"><Upload className="h-4 w-4" /> Enviar</Button>
            </form>
          </CardContent>
        </Card>

        <section className="min-w-0">
          <header className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Supabase Storage</p>
            <h1 className="mt-2 break-words text-4xl font-bold">Banco de imagens</h1>
            <p className="mt-3 break-all text-white/62">Bucket: {storageBucket}</p>
          </header>
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
                  <p className="text-white/65">Nenhuma imagem listada. Confira as variáveis do Supabase e o bucket.</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
