import { CalendarPlus, Pencil, Plus, Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DayOffWorkTag, HalfDayTag, LateTag, StatusBadge } from "@/components/ui/StatusBadge";
import { AttendanceDialogButton } from "@/components/dashboard/AttendanceDialogButton";
import { ExtraHoursDialogButton } from "@/components/dashboard/ExtraHoursDialogButton";
import { cn } from "@/lib/cn";
import type { DayRow } from "@/lib/calendar";
import {
  formatShortDate,
  formatWeekdayShort,
  minutesToClock,
  minutesToDuration,
  minutesToDurationSigned,
  type TimeFormat,
} from "@/lib/time";

function differenceClass(row: DayRow) {
  return row.differenceMinutes == null
    ? "text-muted-foreground"
    : row.differenceMinutes >= 0
    ? "text-extra"
    : "text-less";
}

/** Rows with nothing to count are drawn quieter so the real days stand out. */
function isQuiet(row: DayRow) {
  return (
    row.status === "non-working" || row.status === "future" || row.status === "not-tracked"
  );
}

function hasTimes(row: DayRow) {
  return row.entryMinutes != null || row.outMinutes != null;
}



function Tags({ row }: { row: DayRow }) {
  return (
    <>
      <StatusBadge status={row.status} leaveType={row.leaveType} />
      {row.isLate && <LateTag />}
      {row.isHalfDay && row.isWorkingDay && !row.leaveType && <HalfDayTag />}
      {!row.isWorkingDay && hasTimes(row) && !row.leaveType && <DayOffWorkTag />}
    </>
  );
}

function EditButton({
  row,
  halfDayMinutes,
  compact,
}: {
  row: DayRow;
  halfDayMinutes: number;
  compact?: boolean;
}) {
  const hasRecord = hasTimes(row) || row.leaveType != null;
  const label = hasRecord ? "Edit" : row.isFuture ? "Plan" : "Add";
  const Icon = hasRecord ? Pencil : row.isFuture ? CalendarPlus : Plus;
  return (
    <AttendanceDialogButton
      row={row}
      halfDayMinutes={halfDayMinutes}
      label={label}
      variant={compact ? "secondary" : "ghost"}
      size="sm"
      icon={<Icon className="h-3.5 w-3.5" />}
      className={cn(!hasRecord && "opacity-70 hover:opacity-100")}
    />
  );
}

function ExtraButton({ row, compact }: { row: DayRow; compact?: boolean }) {
  if (row.isFuture) return null;
  const hasExtra = row.extraEntryMinutes != null;
  return (
    <ExtraHoursDialogButton
      row={row}
      label={hasExtra ? "Extra" : "+ Extra"}
      variant={compact ? "secondary" : "ghost"}
      size="sm"
      icon={<Timer className="h-3.5 w-3.5" />}
      className={cn(!hasExtra && "opacity-70 hover:opacity-100")}
    />
  );
}

export function AttendanceTable({
  rows,
  timeFormat,
  halfDayMinutes,
}: {
  rows: DayRow[];
  timeFormat: TimeFormat;
  halfDayMinutes: number;
}) {
  const clock = (m: number | null) => (m != null ? minutesToClock(m, timeFormat) : "—");

  return (
    <Card className="overflow-hidden">
      {/* Phones: stacked day cards instead of a wide, sideways-scrolling table */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li
            key={row.dateKey}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              row.isToday && "bg-brand-600/[0.06]",
              isQuiet(row) && "opacity-60"
            )}
          >
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
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tags row={row} />
              </div>
              {hasTimes(row) && !row.leaveType && (
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  <span className="whitespace-nowrap">
                    {clock(row.entryMinutes)} → {clock(row.outMinutes)}
                  </span>
                  {row.workedMinutes != null && (
                    <span className="whitespace-nowrap"> · {minutesToDuration(row.workedMinutes)}</span>
                  )}
                </p>
              )}
              {row.extraEntryMinutes != null && (
                <p className="mt-0.5 text-xs tabular-nums text-extra">
                  <span className="whitespace-nowrap">
                    Extra {clock(row.extraEntryMinutes)} → {row.extraInProgress ? "running" : clock(row.extraOutMinutes)}
                  </span>
                  {row.extraMinutes != null && (
                    <span className="whitespace-nowrap"> · {minutesToDuration(row.extraMinutes)}</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {row.differenceMinutes != null && (
                <span className={cn("text-sm font-semibold tabular-nums", differenceClass(row))}>
                  {minutesToDurationSigned(row.differenceMinutes)}
                </span>
              )}
              <EditButton row={row} halfDayMinutes={halfDayMinutes} compact />
              <ExtraButton row={row} compact />
            </div>
          </li>
        ))}
      </ul>

      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Entry</th>
              <th className="px-3 py-3 font-medium">Out</th>
              <th className="px-3 py-3 font-medium">Worked</th>
              <th className="px-3 py-3 font-medium">Expected</th>
              <th className="px-3 py-3 font-medium">Difference</th>
              <th className="px-3 py-3 font-medium">Extra hours</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={row.dateKey}
                className={cn(
                  "group transition-colors hover:bg-muted/40",
                  row.isToday && "bg-brand-600/[0.06] hover:bg-brand-600/10",
                  isQuiet(row) && "text-muted-foreground"
                )}
              >
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2">
                    {row.isToday && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                    <span className="font-medium">{formatShortDate(row.date)}</span>
                    <span className="text-xs text-muted-foreground">{formatWeekdayShort(row.date)}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {clock(row.entryMinutes)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {clock(row.outMinutes)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                  {row.workedMinutes != null ? minutesToDuration(row.workedMinutes) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {row.expectedMinutes > 0 ? minutesToDuration(row.expectedMinutes) : "—"}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-3 font-medium tabular-nums",
                    differenceClass(row)
                  )}
                >
                  {row.differenceMinutes != null
                    ? minutesToDurationSigned(row.differenceMinutes)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                  {row.extraMinutes != null ? (
                    <span className="font-medium text-extra">
                      {minutesToDuration(row.extraMinutes)}
                      {row.extraInProgress && " …"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Tags row={row} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ExtraButton row={row} />
                    <EditButton row={row} halfDayMinutes={halfDayMinutes} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
