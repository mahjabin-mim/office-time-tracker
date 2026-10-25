"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { saveAttendanceAction, deleteAttendanceAction } from "@/lib/actions/attendance";
import { Input, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Briefcase, Palmtree, PartyPopper, Timer, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { DayRow } from "@/lib/calendar";
import { LEAVE_LABELS, minutesToClock, minutesToDuration, type LeaveType } from "@/lib/time";

type DayType = "work" | LeaveType;

const DAY_TYPES: { value: DayType; label: string; icon: typeof Briefcase }[] = [
  { value: "work", label: "Worked", icon: Briefcase },
  { value: "leave", label: "Leave", icon: Palmtree },
  { value: "holiday", label: "Holiday", icon: PartyPopper },
];

export function AttendanceForm({
  row,
  dateLabel,
  hasRecord,
  halfDayMinutes,
  onSaved,
}: {
  row: DayRow;
  dateLabel: string;
  hasRecord: boolean;
  halfDayMinutes: number;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(saveAttendanceAction, null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Future days can only be planned as leave; there are no times to record yet. Legacy "sick"
  // days open as plain leave.
  const [dayType, setDayType] = useState<DayType>(
    row.leaveType ? (row.leaveType === "sick" ? "leave" : row.leaveType) : row.isFuture ? "leave" : "work"
  );
  const savedOnceRef = useRef(false);
  const dayTypes = row.isFuture ? DAY_TYPES.filter((t) => t.value !== "work") : DAY_TYPES;

  useEffect(() => {
    if (state?.success && !savedOnceRef.current) {
      savedOnceRef.current = true;
      toast(dayType === "work" ? "Time saved" : `Marked as ${LEAVE_LABELS[dayType].toLowerCase()}`);
      onSaved?.();
    }
  }, [state, onSaved, dayType]);

  async function handleConfirmDelete() {
    setDeleting(true);
    await deleteAttendanceAction(row.dateKey);
    setDeleting(false);
    toast("Day cleared", "info");
    onSaved?.();
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={row.dateKey} />
      <p className="text-sm text-muted-foreground">{dateLabel}</p>

      {state?.error && <Alert>{state.error}</Alert>}

      <div
        role="radiogroup"
        aria-label="Day type"
        className={cn(
          "grid gap-1.5 rounded-2xl bg-muted p-1",
          dayTypes.length === 3 ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {dayTypes.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-soft"
          >
            <input
              type="radio"
              name="dayType"
              value={value}
              checked={dayType === value}
              onChange={() => setDayType(value)}
              className="sr-only"
            />
            <Icon className="h-4 w-4" />
            {label}
          </label>
        ))}
      </div>

      {/* Plain keyed elements with a CSS entrance: a nested AnimatePresence here kept the
          dialog's own exit animation from finishing, leaving it stuck open after saving. */}
      {dayType === "work" ? (
        <div key="work" className="animate-fade-in-up space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              name="entryTime"
              label="Entry time"
              defaultValue={row.entryMinutes != null ? minutesToClock(row.entryMinutes, "24h") : ""}
              showNow={row.isToday}
              error={state?.fieldErrors?.entryTime}
            />
            <TimeField
              name="outTime"
              label="Out time"
              defaultValue={row.outMinutes != null ? minutesToClock(row.outMinutes, "24h") : ""}
              showNow={row.isToday}
              error={state?.fieldErrors?.outTime}
            />
          </div>

          {row.isWorkingDay ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input px-3.5 py-3 transition-colors hover:bg-muted/50 has-[:checked]:border-sky-500/50 has-[:checked]:bg-sky-500/10">
              <input
                type="checkbox"
                name="isHalfDay"
                defaultChecked={row.isHalfDay}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium">Half day</span>
                <span className="block text-xs text-muted-foreground">
                  Expected working time is {minutesToDuration(halfDayMinutes)}.
                </span>
              </span>
            </label>
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              This is one of your days off, so every minute you work counts as extra time.
            </p>
          )}
        </div>
      ) : (
        <p
          key="leave"
          className="animate-fade-in-up rounded-xl border border-violet-500/30 bg-violet-500/10 px-3.5 py-3 text-sm text-violet-700 dark:text-violet-300"
        >
          This day won&apos;t count as missing or as less time. Nothing is expected from you.
        </p>
      )}

      {!row.isFuture && (
        <div className="space-y-3 rounded-2xl border border-border p-3.5">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              Extra hours
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional. All of it counts as extra time. If it&apos;s still running at 11:59 PM it
              continues on the next day automatically.
            </p>
          </div>
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
        </div>
      )}

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

function TimeField({
  name,
  label,
  defaultValue,
  showNow,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  showNow: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function fillNow() {
    const now = new Date();
    if (inputRef.current) {
      inputRef.current.value = minutesToClock(now.getHours() * 60 + now.getMinutes(), "24h");
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {showNow && (
          <button
            type="button"
            onClick={fillNow}
            className="rounded-md px-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-600/10 dark:text-brand-400"
          >
            Now
          </button>
        )}
      </div>
      <Input ref={inputRef} id={name} name={name} type="time" defaultValue={defaultValue ?? ""} />
      <FieldError>{error}</FieldError>
    </div>
  );
}
