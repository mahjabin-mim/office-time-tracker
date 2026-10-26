"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveExtraHoursAction, clearExtraHoursAction } from "@/lib/actions/attendance";
import { TimeField } from "@/components/dashboard/TimeField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import type { DayRow } from "@/lib/calendar";
import { minutesToClock } from "@/lib/time";

export function ExtraHoursForm({
  row,
  dateLabel,
  onSaved,
}: {
  row: DayRow;
  dateLabel: string;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(saveExtraHoursAction, null);
  const [clearing, setClearing] = useState(false);
  const savedOnceRef = useRef(false);
  const hasExtra = row.extraEntryMinutes != null;

  useEffect(() => {
    if (state?.success && !savedOnceRef.current) {
      savedOnceRef.current = true;
      toast("Extra hours saved");
      onSaved?.();
    }
  }, [state, onSaved]);

  async function handleClear() {
    setClearing(true);
    await clearExtraHoursAction(row.dateKey);
    setClearing(false);
    toast("Extra hours cleared", "info");
    onSaved?.();
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={row.dateKey} />
      <p className="text-sm text-muted-foreground">{dateLabel}</p>

      {state?.error && <Alert>{state.error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <TimeField
          name="extraEntryTime"
          label="Entry time"
          defaultValue={
            row.extraEntryMinutes != null ? minutesToClock(row.extraEntryMinutes, "24h") : ""
          }
          showNow={row.isToday}
          error={state?.fieldErrors?.extraEntryTime}
        />
        <TimeField
          name="extraOutTime"
          label="Out time"
          defaultValue={
            row.extraOutMinutes != null ? minutesToClock(row.extraOutMinutes, "24h") : ""
          }
          showNow={row.isToday}
          error={state?.fieldErrors?.extraOutTime}
        />
      </div>

      <p className="rounded-xl border border-extra/30 bg-extra/10 px-3.5 py-2.5 text-xs text-extra">
        Every minute counts as extra time. If a session is still running at 11:59 PM it continues on
        the next day automatically.
      </p>

      <div className="flex items-center justify-between gap-3">
        {hasExtra ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={clearing}
            className="text-less hover:bg-less/10"
          >
            <Trash2 className="h-4 w-4" />
            {clearing ? "Clearing…" : "Clear"}
          </Button>
        ) : (
          <span />
        )}
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}
