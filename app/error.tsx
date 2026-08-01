"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Safe client log — no tokens/PII. Digest helps correlate with server logs.
    console.error("[app-error]", error.digest || error.name);
  }, [error]);

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-center shadow-[var(--shadow-md)]">
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--secondary)]">Erro inesperado</p>
        <h1 className="mt-3 text-2xl font-bold">Nao foi possivel carregar esta pagina</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          Tente novamente. Se o problema continuar, saia da conta e entre de novo.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">Codigo: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            Tentar novamente
          </Button>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-semibold hover:bg-white/[0.06]"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
