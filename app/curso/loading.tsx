export default function CursoLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]" aria-busy="true" aria-label="Carregando curso">
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-[var(--border)] bg-[var(--surface-elevated)] md:block" />
      <div className="sticky top-0 z-20 flex h-[72px] items-center border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 md:pl-[104px]">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="flex h-[calc(100dvh-72px)] items-center justify-center px-4 md:pl-[104px]">
        <div className="h-8 w-48 animate-pulse rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}
