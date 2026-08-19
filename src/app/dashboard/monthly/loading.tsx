import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function MonthlyLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-48 rounded-xl" />
      </div>

      <div className="space-y-4">
        <Card className="p-5 sm:max-w-sm">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-3 h-8 w-24" />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-3 h-8 w-20" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <Skeleton className="mb-4 h-4 w-28" />
        <Skeleton className="h-40 w-full" />
      </Card>

      <div>
        <Skeleton className="mb-3 h-4 w-40" />
        <Card className="overflow-hidden p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-9 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
