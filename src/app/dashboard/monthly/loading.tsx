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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:row-span-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-12 w-36" />
          <Skeleton className="mt-2 h-3.5 w-32" />
          <Skeleton className="mt-10 h-2.5 w-full rounded-full" />
        </Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
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
