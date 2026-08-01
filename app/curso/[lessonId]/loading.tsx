/**
 * Immediate soft-navigation feedback for Dashboard → /curso/[lessonId].
 * Visual skeleton only — no fake data.
 */
export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-[#09070d] text-[#F5F3F3]" aria-busy="true" aria-label="Carregando aula">
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-white/10 bg-[#121015] md:block" />
      <div className="sticky top-0 z-20 flex h-[72px] items-center border-b border-white/10 bg-[#111017]/95 px-4 md:pl-[104px] md:pr-8">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="flex h-[calc(100dvh-72px)] min-h-0 flex-col overflow-hidden md:pl-[72px] xl:block">
        <div className="h-20 shrink-0 animate-pulse border-b border-white/10 bg-white/[0.04] xl:hidden" />
        <div className="hidden animate-pulse border-r border-white/10 bg-white/[0.04] xl:fixed xl:bottom-0 xl:left-[72px] xl:top-[72px] xl:block xl:w-[440px]" />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 xl:ml-[440px] xl:h-full xl:px-8 xl:py-8">
          <article className="mx-auto min-w-0 max-w-6xl rounded-lg border border-white/10 bg-[#151019]">
            <div className="border-b border-white/10 p-3 sm:p-5">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
                <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
                <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
            </div>
            <div className="space-y-5 p-4 sm:p-5">
              <div className="h-32 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
                <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
              <div className="h-72 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
