"use client";

import { useState } from "react";
import { SearchX } from "lucide-react";
import { AttendanceTable } from "@/components/dashboard/AttendanceTable";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import type { DayRow } from "@/lib/calendar";
import type { TimeFormat } from "@/lib/time";

type FilterKey =
  | "all"
  | "extra"
  | "less"
  | "on-target"
  | "missing"
  | "leave"
  | "day-off"
  | "late"
  | "extra-hours";

const FILTERS: { key: FilterKey; label: string; matches: (row: DayRow) => boolean }[] = [
  { key: "all", label: "All", matches: () => true },
  { key: "extra", label: "Extra", matches: (r) => r.status === "extra" },
  { key: "less", label: "Less", matches: (r) => r.status === "less" },
  { key: "on-target", label: "On target", matches: (r) => r.status === "on-target" },
  {
    key: "missing",
    label: "Missing",
    matches: (r) => r.status === "missing" || r.status === "incomplete",
  },
  { key: "leave", label: "Leave", matches: (r) => r.status === "leave" },
  { key: "day-off", label: "Day off", matches: (r) => r.status === "non-working" },
  { key: "late", label: "Late", matches: (r) => r.isLate },
  { key: "extra-hours", label: "Extra hours", matches: (r) => r.extraMinutes != null },
];

/** The month's day table with status filter chips; chips with no matching days are hidden. */
export function MonthlyAttendance({
  rows,
  timeFormat,
  halfDayMinutes,
}: {
  rows: DayRow[];
  timeFormat: TimeFormat;
  halfDayMinutes: number;
}) {
  const [active, setActive] = useState<FilterKey>("all");

  const options = FILTERS.map((f) => ({ ...f, count: rows.filter(f.matches).length })).filter(
    (f) => f.key === "all" || f.count > 0
  );
  const current = options.find((o) => o.key === active) ?? options[0];
  const visible = rows.filter(current.matches);

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {options.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={current.key === key}
            onClick={() => setActive(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              current.key === key
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "tabular-nums",
                current.key === key ? "text-white/80" : "text-muted-foreground/70"
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <AttendanceTable rows={visible} timeFormat={timeFormat} halfDayMinutes={halfDayMinutes} />
      ) : (
        <Card>
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title="No matching days"
            description="No days this month match that status."
          />
        </Card>
      )}
    </div>
  );
}
