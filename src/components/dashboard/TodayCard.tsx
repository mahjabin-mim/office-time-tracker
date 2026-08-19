import { CalendarClock, Pencil, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { AttendanceDialogButton } from "@/components/dashboard/AttendanceDialogButton";
import {
  formatDayLabel,
  minutesToClock,
  toDateKey,
  type DayStatus,
  type TimeFormat,
} from "@/lib/time";

export function TodayCard({
  today,
  entryMinutes,
  outMinutes,
  status,
  workedMinutes,
  expectedMinutes,
  differenceMinutes,
  timeFormat,
}: {
  today: Date;
  entryMinutes: number | null;
  outMinutes: number | null;
  status: DayStatus;
  workedMinutes: number | null;
  expectedMinutes: number;
  differenceMinutes: number | null;
  timeFormat: TimeFormat;
}) {
  const dateKey = toDateKey(today);
  const hasRecord = entryMinutes != null || outMinutes != null;

  if (!hasRecord) {
    return (
      <Card className="p-2">
        <div className="flex items-center justify-between px-3 pt-3">
          <p className="text-sm font-semibold text-muted-foreground">
            Today &mdash; {formatDayLabel(today)}
          </p>
        </div>
        <div className="p-4">
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title="No time recorded yet today"
            description="Add your entry time to start tracking today's balance."
            action={
              <AttendanceDialogButton
                dateKey={dateKey}
                dateLabel={formatDayLabel(today)}
                label="Add Today's Time"
                icon={<Plus className="h-4 w-4" />}
              />
            }
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-5 py-4">
        <div>
          <p className="text-sm font-semibold">Today &mdash; {formatDayLabel(today)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <Stat label="Entry" value={entryMinutes != null ? minutesToClock(entryMinutes, timeFormat) : "—"} />
        <Stat label="Out" value={outMinutes != null ? minutesToClock(outMinutes, timeFormat) : "—"} />
        <Stat
          label="Worked"
          value={
            workedMinutes != null ? (
              <AnimatedNumber value={workedMinutes} format="duration" />
            ) : (
              "—"
            )
          }
        />
        <Stat label="Expected" value={<AnimatedNumber value={expectedMinutes} format="duration" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p
            className={`text-lg font-semibold ${
              differenceMinutes != null && differenceMinutes < 0 ? "text-less" : "text-extra"
            }`}
          >
            {differenceMinutes != null ? (
              <AnimatedNumber value={differenceMinutes} format="signed" />
            ) : (
              "—"
            )}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {differenceMinutes == null
                ? ""
                : differenceMinutes >= 0
                ? "Extra"
                : "Less"}
            </span>
          </p>
        </div>
        <AttendanceDialogButton
          dateKey={dateKey}
          dateLabel={formatDayLabel(today)}
          initialEntry={entryMinutes != null ? minutesToClock(entryMinutes, "24h") : undefined}
          initialOut={outMinutes != null ? minutesToClock(outMinutes, "24h") : undefined}
          hasRecord
          label="Edit"
          variant="secondary"
          icon={<Pencil className="h-4 w-4" />}
        />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
