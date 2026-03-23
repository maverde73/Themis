import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonPageProps {
  header?: boolean;
  filters?: boolean;
  rows?: number;
}

export function SkeletonPage({
  header = true,
  filters = true,
  rows = 5,
}: SkeletonPageProps) {
  return (
    <div className="space-y-6">
      {header && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      )}

      {filters && (
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      )}

      <div className="space-y-3">
        {/* Table header */}
        <div className="flex gap-4 px-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-4 rounded-md border px-2 py-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
