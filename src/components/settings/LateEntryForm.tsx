"use client";

import { useActionState } from "react";
import { updateLateEntryAction } from "@/lib/actions/settings";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { minutesToClock } from "@/lib/time";

export function LateEntryForm({ lateAfterMinutes }: { lateAfterMinutes: number | null }) {
  const [state, formAction] = useActionState(updateLateEntryAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.success && <Alert variant="success">Late entry time updated.</Alert>}

      <div>
        <Label htmlFor="lateAfter">Late after</Label>
        <Input
          id="lateAfter"
          name="lateAfter"
          type="time"
          defaultValue={lateAfterMinutes != null ? minutesToClock(lateAfterMinutes, "24h") : ""}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          An entry after this time on a working day is marked late, and counted each month. Leave it
          empty to turn this off.
        </p>
        <FieldError>{state?.fieldErrors?.lateAfter}</FieldError>
      </div>

      <SubmitButton pendingLabel="Saving…">Save late entry time</SubmitButton>
    </form>
  );
}
