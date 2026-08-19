import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";
import type { DayRow } from "@/lib/data";
import {
  formatShortDate,
  minutesToClock,
  minutesToDuration,
  type TimeFormat,
} from "@/lib/time";

export function RecentAttendanceList({
  rows,
  timeFormat,
}: {
  rows: DayRow[];
  timeFormat: TimeFormat;
}) {
  const relevant = rows.filter((r) => r.status !== "future").slice(-7).reverse();

  if (relevant.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title="No attendance yet"
        description="Your recent days will show up here once you start logging time."
      />
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {relevant.map((row) => (
        <div
          key={row.dateKey}
          className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{formatShortDate(row.date)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.entryMinutes != null ? minutesToClock(row.entryMinutes, timeFormat) : "—"}
              {" · "}
              {row.outMinutes != null ? minutesToClock(row.outMinutes, timeFormat) : "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
              {row.workedMinutes != null ? minutesToDuration(row.workedMinutes) : "—"}
            </span>
            <StatusBadge status={row.status} />
          </div>
        </div>
      ))}
    </Card>
  );
}
