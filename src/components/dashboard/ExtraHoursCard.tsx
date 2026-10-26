import { Pencil, Plus, Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ExtraHoursDialogButton } from "@/components/dashboard/ExtraHoursDialogButton";
import { ClockButton } from "@/components/dashboard/ClockButton";
import type { DayRow } from "@/lib/calendar";
import { minutesToClock, minutesToDuration, type TimeFormat } from "@/lib/time";

/** Today's extra-hours session: start it, watch it run, or see what was logged. */
export function ExtraHoursCard({
  row,
  timeFormat,
}: {
  row: DayRow;
  timeFormat: TimeFormat;
}) {
  const started = row.extraEntryMinutes != null;
  const finished = started && row.extraOutMinutes != null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-extra/15 text-extra">
          <Timer className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Extra hours</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {!started && "Working extra today? Start a session. Every minute counts as extra."}
            {started && (
              <>
                {minutesToClock(row.extraEntryMinutes!, timeFormat)} →{" "}
                {finished ? minutesToClock(row.extraOutMinutes!, timeFormat) : "running"}
                {row.extraMinutes != null && ` · ${minutesToDuration(row.extraMinutes)}`}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        {started && (
          <ExtraHoursDialogButton
            row={row}
            label="Edit"
            variant="ghost"
            icon={<Pencil className="h-4 w-4" />}
          />
        )}
        {!started && (
          <ExtraHoursDialogButton
            row={row}
            label="Add manually"
            variant="ghost"
            icon={<Plus className="h-4 w-4" />}
          />
        )}
        {!started && <ClockButton mode="in" extra variant="secondary" />}
        {started && !finished && <ClockButton mode="out" extra />}
      </div>
    </Card>
  );
}
