export default function TeamLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="h-20 max-w-xl animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="h-28 animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />
    </div>
  );
}
