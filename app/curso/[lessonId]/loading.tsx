/**
 * Soft-navigation skeleton for /curso/[lessonId].
 * Matches the Notion-like document shell — never the old 3-card dashboard.
 */
export default function LessonLoading() {
  return (
    <div
      className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#09070d] text-[#F5F3F3]"
      aria-busy="true"
      aria-label="Carregando aula"
    >
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] border-r border-white/10 bg-[#121015] md:block" />
      <div className="flex h-[72px] shrink-0 items-center border-b border-white/10 bg-[#111017]/95 px-4 md:pl-[104px] md:pr-8">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="lesson-shell flex min-h-0 flex-1 flex-col overflow-hidden md:pl-[72px] xl:grid xl:grid-cols-[minmax(280px,440px)_minmax(0,1fr)]">
        <div className="h-14 shrink-0 animate-pulse border-b border-white/10 bg-white/[0.04] xl:hidden" />
        <div className="course-sidebar hidden min-h-0 animate-pulse border-r border-white/10 bg-white/[0.03] xl:block" />
        <div className="lesson-main min-h-0 min-w-0 flex-1 overflow-y-scroll px-4 py-6 sm:px-6 md:px-10">
          <div className="mx-auto w-full max-w-[920px] space-y-6" aria-hidden>
            <div className="h-3.5 w-52 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-10 w-full max-w-xl animate-pulse rounded bg-white/[0.07]" />
            <div className="h-4 w-64 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-1.5 max-w-sm animate-pulse rounded-full bg-white/[0.05]" />
            <div className="h-24 animate-pulse rounded-r-xl border-l-[3px] border-l-[#8A1DEE]/50 bg-[#8A1DEE]/[0.06]" />
            <div className="space-y-2">
              <div className="h-5 w-28 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-16 animate-pulse rounded bg-white/[0.03]" />
            </div>
            <div className="space-y-4">
              <div className="h-5 w-36 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-14 animate-pulse rounded bg-white/[0.03]" />
              <div className="h-14 animate-pulse rounded bg-white/[0.03]" />
              <div className="h-14 animate-pulse rounded bg-white/[0.03]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
