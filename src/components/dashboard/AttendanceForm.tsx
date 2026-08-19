"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { saveAttendanceAction, deleteAttendanceAction } from "@/lib/actions/attendance";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Trash2 } from "lucide-react";

export function AttendanceForm({
  dateKey,
  dateLabel,
  initialEntry,
  initialOut,
  hasRecord,
  onSaved,
}: {
  dateKey: string;
  dateLabel: string;
  initialEntry?: string;
  initialOut?: string;
  hasRecord?: boolean;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(saveAttendanceAction, null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const savedOnceRef = useRef(false);

  useEffect(() => {
    if (state?.success && !savedOnceRef.current) {
      savedOnceRef.current = true;
      onSaved?.();
    }
  }, [state, onSaved]);

  async function handleConfirmDelete() {
    setDeleting(true);
    await deleteAttendanceAction(dateKey);
    setDeleting(false);
    onSaved?.();
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={dateKey} />
      <p className="text-sm text-muted-foreground">{dateLabel}</p>

      {state?.error && <Alert>{state.error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="entryTime">Entry time</Label>
          <Input id="entryTime" name="entryTime" type="time" defaultValue={initialEntry ?? ""} />
          <FieldError>{state?.fieldErrors?.entryTime}</FieldError>
        </div>
        <div>
          <Label htmlFor="outTime">Out time</Label>
          <Input id="outTime" name="outTime" type="time" defaultValue={initialOut ?? ""} />
          <FieldError>{state?.fieldErrors?.outTime}</FieldError>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {confirmingDelete ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-less/30 bg-less/10 px-3.5 py-2.5"
          >
            <p className="text-sm text-less">Remove this day&apos;s record?</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Removing…" : "Yes, delete"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-between gap-3"
          >
            {hasRecord ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(true)}
                className="text-less hover:bg-less/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
