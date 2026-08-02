import { Skeleton } from "@/components/Skeleton";

export default function PortfolioLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            <Skeleton className="h-12 w-9" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
