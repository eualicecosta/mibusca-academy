export default function AdminModuleLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]" aria-busy="true" aria-label="Carregando modulo">
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-[var(--border)] bg-[var(--surface-elevated)] md:block" />
      <div className="sticky top-0 z-20 flex h-[72px] items-center border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 md:pl-[104px]">
        <div className="h-6 w-44 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="space-y-6 px-4 py-8 md:pl-[104px] md:pr-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-10 w-72 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="h-40 animate-pulse rounded-lg border border-[var(--border)] bg-white/[0.04]" />
          <div className="h-64 animate-pulse rounded-lg border border-[var(--border)] bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
