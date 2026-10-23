import { Card } from "@/components/ui/Card";
import { DayOffWorkTag, HalfDayTag, StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DayRow } from "@/lib/data";
import {
  formatShortDate,
  formatWeekdayShort,
  minutesToClock,
  minutesToDuration,
  minutesToDurationSigned,
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
          className={cn(
            "flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40",
            (row.status === "non-working" || row.status === "not-tracked") && "opacity-60"
          )}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-surface leading-none",
                row.isToday && "border-brand-600/40 bg-brand-600/10 text-brand-700 dark:text-brand-300"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {formatWeekdayShort(row.date)}
              </span>
              <span className="mt-0.5 text-base font-semibold tabular-nums">
                {row.date.getUTCDate()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-medium">
                {row.isToday ? "Today" : formatShortDate(row.date)}
                {row.isHalfDay && row.isWorkingDay && !row.leaveType && <HalfDayTag />}
                {!row.isWorkingDay && row.workedMinutes != null && <DayOffWorkTag />}
              </p>
              <p className="truncate text-xs tabular-nums text-muted-foreground">
                {row.leaveType ? (
                  "No time expected"
                ) : (
                  <>
                    {row.entryMinutes != null ? minutesToClock(row.entryMinutes, timeFormat) : "—"}
                    {" → "}
                    {row.outMinutes != null ? minutesToClock(row.outMinutes, timeFormat) : "—"}
                    {row.workedMinutes != null && ` · ${minutesToDuration(row.workedMinutes)}`}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {row.differenceMinutes != null && row.status !== "in-progress" && (
              <span
                className={cn(
                  "hidden text-sm font-semibold tabular-nums sm:inline",
                  row.differenceMinutes >= 0 ? "text-extra" : "text-less"
                )}
              >
                {minutesToDurationSigned(row.differenceMinutes)}
              </span>
            )}
            <StatusBadge status={row.status} leaveType={row.leaveType} />
          </div>
        </div>
      ))}
    </Card>
  );
}
