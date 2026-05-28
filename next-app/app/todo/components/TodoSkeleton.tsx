import { Skeleton } from '@/components/ui/skeleton';

export function HeaderSkeleton() {
  return (
    <div className="flex flex-col border-b border-border/30 pb-3 pt-4 gap-3">
      {/* Space title row */}
      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
      </div>

      {/* Space nav tabs */}
      <div className="px-4 flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-xl flex-shrink-0" />
        ))}
        <Skeleton className="h-9 w-32 rounded-xl flex-shrink-0 opacity-50" />
      </div>
    </div>
  );
}

export function FilterSkeleton() {
  return (
    <div className="py-2 border-b border-border/20 px-4 flex gap-2 items-center">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="h-4 w-px bg-border/40 mx-1" />
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex-1 overflow-hidden pt-4 flex gap-4 px-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[300px] flex-shrink-0 flex flex-col gap-4">
          {/* Column Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32 rounded-lg" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>

          {/* Column Blocks */}
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton
                key={j}
                className="h-20 w-full rounded-xl"
                style={{ opacity: 1 - j * 0.15 }}
              />
            ))}
          </div>

          {/* Add Block button skeleton */}
          <Skeleton className="h-9 w-full rounded-lg opacity-40 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function TodoSkeleton() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <HeaderSkeleton />
      <FilterSkeleton />
      <BoardSkeleton />
    </div>
  );
}
