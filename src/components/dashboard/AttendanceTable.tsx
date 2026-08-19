"use client";

import { Pencil, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AttendanceDialogButton } from "@/components/dashboard/AttendanceDialogButton";
import type { DayRow } from "@/lib/data";
import {
  formatDayLabel,
  formatShortDate,
  minutesToClock,
  minutesToDuration,
  minutesToDurationSigned,
  type TimeFormat,
} from "@/lib/time";

export function AttendanceTable({ rows, timeFormat }: { rows: DayRow[]; timeFormat: TimeFormat }) {
  return (
    <Card className="overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Entry</th>
              <th className="px-3 py-3 font-medium">Out</th>
              <th className="px-3 py-3 font-medium">Worked</th>
              <th className="px-3 py-3 font-medium">Expected</th>
              <th className="px-3 py-3 font-medium">Difference</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const editable = row.status !== "non-working" && row.status !== "future";
              const hasRecord = row.entryMinutes != null || row.outMinutes != null;
              return (
                <tr key={row.dateKey} className="transition-colors hover:bg-muted/40">
                  <td className="whitespace-nowrap px-5 py-3 font-medium">
                    {formatShortDate(row.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                    {row.entryMinutes != null ? minutesToClock(row.entryMinutes, timeFormat) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                    {row.outMinutes != null ? minutesToClock(row.outMinutes, timeFormat) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {row.workedMinutes != null ? minutesToDuration(row.workedMinutes) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                    {row.status === "non-working" || row.status === "future"
                      ? "—"
                      : minutesToDuration(row.expectedMinutes)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-3 font-medium tabular-nums ${
                      row.differenceMinutes == null
                        ? "text-muted-foreground"
                        : row.differenceMinutes >= 0
                        ? "text-extra"
                        : "text-less"
                    }`}
                  >
                    {row.differenceMinutes != null ? minutesToDurationSigned(row.differenceMinutes) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {editable && (
                      <AttendanceDialogButton
                        dateKey={row.dateKey}
                        dateLabel={formatDayLabel(row.date)}
                        initialEntry={row.entryMinutes != null ? minutesToClock(row.entryMinutes, "24h") : undefined}
                        initialOut={row.outMinutes != null ? minutesToClock(row.outMinutes, "24h") : undefined}
                        hasRecord={hasRecord}
                        label={hasRecord ? "Edit" : "Add"}
                        variant="ghost"
                        size="sm"
                        icon={hasRecord ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
