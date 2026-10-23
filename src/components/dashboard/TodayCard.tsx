import { CalendarClock, Coffee, Palmtree, Pencil, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DayOffWorkTag, HalfDayTag, StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceDialogButton } from "@/components/dashboard/AttendanceDialogButton";
import { ClockButton } from "@/components/dashboard/ClockButton";
import { TodayProgress } from "@/components/dashboard/TodayProgress";
import { LeaveReminderTimer } from "@/components/dashboard/LeaveReminderTimer";
import { cn } from "@/lib/cn";
import { leaveAtMinutes, type DayRow } from "@/lib/calendar";
import { leaveReminder } from "@/lib/reminders";
import {
  LEAVE_LABELS,
  formatDayLabel,
  minutesToClock,
  minutesToDuration,
  type TimeFormat,
} from "@/lib/time";

export function TodayCard({
  row,
  timeFormat,
  halfDayMinutes,
  nowMinutes,
  remindLeave,
}: {
  row: DayRow;
  timeFormat: TimeFormat;
  halfDayMinutes: number;
  /** Minutes since midnight in the user's time zone when the page rendered. */
  nowMinutes: number;
  remindLeave: boolean;
}) {
  const dateLabel = formatDayLabel(row.date);
  const hasTimes = row.entryMinutes != null || row.outMinutes != null;

  if (row.leaveType) {
    return (
      <Card className="p-2">
        <CardDate label={dateLabel} />
        <div className="p-4">
          <EmptyState
            icon={<Palmtree className="h-6 w-6" />}
            title={`${LEAVE_LABELS[row.leaveType]} today`}
            description="Enjoy it. Nothing is expected from you today."
            action={
              <AttendanceDialogButton
                row={row}
                halfDayMinutes={halfDayMinutes}
                label="Edit day"
                variant="secondary"
                icon={<Pencil className="h-4 w-4" />}
              />
            }
          />
        </div>
      </Card>
    );
  }

  if (!hasTimes) {
    const dayOff = !row.isWorkingDay;
    return (
      <Card className="p-2">
        <CardDate label={dateLabel} />
        <div className="p-4">
          <EmptyState
            icon={dayOff ? <Coffee className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}
            title={dayOff ? "It's your day off" : "Ready to start your day?"}
            description={
              dayOff
                ? "Nothing is expected today. If you do work, all of it counts as extra time."
                : "Clock in with one tap, or add your times manually."
            }
            action={
              <div className="flex flex-wrap items-start justify-center gap-2">
                <ClockButton
                  mode="in"
                  label={dayOff ? "Clock in anyway" : "Clock in"}
                  variant={dayOff ? "secondary" : "primary"}
                  size={dayOff ? "md" : "lg"}
                />
                <AttendanceDialogButton
                  row={row}
                  halfDayMinutes={halfDayMinutes}
                  label={dayOff ? "Add manually" : "Add manually or mark leave"}
                  variant="ghost"
                  size={dayOff ? "md" : "lg"}
                  icon={<Plus className="h-4 w-4" />}
                />
              </div>
            }
          />
        </div>
      </Card>
    );
  }

  const inProgress = row.status === "in-progress";
  const leaveAt = row.expectedMinutes > 0 ? leaveAtMinutes(row) : null;
  const reminder = leaveReminder(row);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {inProgress && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
            </span>
          )}
          <p className="text-sm font-semibold">Today &mdash; {dateLabel}</p>
          {row.isHalfDay && row.isWorkingDay && <HalfDayTag />}
          {!row.isWorkingDay && <DayOffWorkTag />}
        </div>
        <StatusBadge status={row.status} />
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1fr_15rem] md:items-center">
        <TodayProgress
          workedMinutes={row.workedMinutes}
          expectedMinutes={row.expectedMinutes}
          differenceMinutes={row.differenceMinutes}
          inProgress={inProgress}
        />

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-surface/60 p-4 md:grid-cols-1 md:gap-4">
          <Stat
            label="Entry"
            value={row.entryMinutes != null ? minutesToClock(row.entryMinutes, timeFormat) : "—"}
          />
          <Stat
            label="Out"
            value={row.outMinutes != null ? minutesToClock(row.outMinutes, timeFormat) : "—"}
          />
          {inProgress && leaveAt != null ? (
            <Stat label="Leave at" value={minutesToClock(leaveAt, timeFormat)} highlight />
          ) : (
            <Stat label="Break" value={minutesToDuration(row.breakMinutes)} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
        <AttendanceDialogButton
          row={row}
          halfDayMinutes={halfDayMinutes}
          label="Edit"
          variant={inProgress ? "ghost" : "secondary"}
          icon={<Pencil className="h-4 w-4" />}
        />
        {inProgress && <ClockButton mode="out" />}
      </div>

      {inProgress && remindLeave && leaveAt != null && leaveAt > nowMinutes && (
        <LeaveReminderTimer
          leaveAtIso={new Date(Date.now() + (leaveAt - nowMinutes) * 60_000).toISOString()}
          tag={`leave-${row.dateKey}`}
          title={reminder.title}
          body={reminder.body}
        />
      )}
    </Card>
  );
}

function CardDate({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-3 pt-3">
      <p className="text-sm font-semibold text-muted-foreground">Today &mdash; {label}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-semibold tabular-nums sm:text-lg",
          highlight && "text-brand-600 dark:text-brand-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}
