export default function SellerLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="h-20 max-w-xl animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
