import { Skeleton } from "@/components/Skeleton";

export default function MarketLoading() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-8 w-full max-w-xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            <Skeleton className="h-12 w-9" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
