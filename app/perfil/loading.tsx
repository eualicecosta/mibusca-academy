export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]" aria-busy="true" aria-label="Carregando perfil">
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-[var(--border)] bg-[var(--surface-elevated)] md:block" />
      <div className="sticky top-0 z-20 flex h-[72px] items-center border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 md:pl-[104px]">
        <div className="h-6 w-36 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="px-4 py-8 md:pl-[104px] md:pr-8">
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="h-80 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/[0.04]" />
          <div className="h-[28rem] animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
