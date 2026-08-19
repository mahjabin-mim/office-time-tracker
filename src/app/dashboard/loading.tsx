import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-28" />
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-surface/60 p-5">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-14" />
                <Skeleton className="mt-2 h-5 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-36" />
        <Card className="divide-y divide-border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
