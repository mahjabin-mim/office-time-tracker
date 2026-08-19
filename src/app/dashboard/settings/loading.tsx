import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-20" />
            <div className="mt-4 space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </Card>
        ))}
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-5 lg:col-span-2">
            <Skeleton className="h-4 w-36" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="mt-4 h-10 w-32" />
          </Card>
        ))}
      </div>
    </div>
  );
}
