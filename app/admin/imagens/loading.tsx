export default function ImagesLoading() {
  return (
    <div className="min-h-screen bg-[#09070d] text-[#F5F3F3]" aria-busy="true" aria-label="Carregando banco de imagens">
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-white/10 bg-[#121015] md:block" />
      <div className="sticky top-0 z-20 flex h-[72px] items-center border-b border-white/10 bg-[#111017]/95 px-4 md:pl-[104px]">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="px-4 py-8 md:pl-[104px] md:pr-8">
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="h-72 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-video animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}