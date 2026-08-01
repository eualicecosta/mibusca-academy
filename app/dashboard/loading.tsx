export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]" aria-busy="true" aria-label="Carregando dashboard">
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-[var(--border)] bg-[var(--surface-elevated)] md:block" />
      <div className="sticky top-0 z-20 flex h-[72px] items-center border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 md:pl-[104px]">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="px-4 py-8 md:pl-[104px] md:pr-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-56 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/[0.04]" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/[0.04]" />
            <div className="h-40 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/[0.04]" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[292px] w-[220px] shrink-0 animate-pulse rounded-[var(--radius-lg)] bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
