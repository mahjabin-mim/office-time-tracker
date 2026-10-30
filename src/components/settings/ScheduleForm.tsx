"use client";

import { useActionState, useState } from "react";
import { updateScheduleAction } from "@/lib/actions/settings";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { halfDayMinutesFor, minutesToClock, minutesToDuration } from "@/lib/time";
import type { WorkSchedule } from "@prisma/client";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function ScheduleForm({ schedule }: { schedule: WorkSchedule }) {
  const [state, formAction] = useActionState(updateScheduleAction, null);
  const [dailyHours, setDailyHours] = useState(String(schedule.expectedDailyMinutes / 60));
  const workingDays = new Set(schedule.workingDays.split(",").map(Number));
  const daily = Number(dailyHours);
  const halfDayMinutes = dailyHours && daily >= 1 && daily <= 24 ? halfDayMinutesFor(daily * 60) : null;

  return (
    <form action={formAction} className="space-y-5">
      {state?.success && <Alert variant="success">Working schedule updated.</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="expectedDailyHours">Expected daily hours</Label>
          <Input
            id="expectedDailyHours"
            name="expectedDailyHours"
            type="number"
            step={0.25}
            min={1}
            max={24}
            value={dailyHours}
            onChange={(e) => setDailyHours(e.target.value)}
          />
          <FieldError>{state?.fieldErrors?.expectedDailyMinutes}</FieldError>
        </div>
        <div>
          <Label>Half-day hours</Label>
          <div className="flex h-11 items-center rounded-xl border border-input bg-muted/40 px-3.5 text-sm text-muted-foreground">
            {halfDayMinutes != null ? minutesToDuration(halfDayMinutes) : "—"}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Half of your daily hours. Expected on days you tick &ldquo;Half day&rdquo;.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="workStart">Work start time</Label>
          <Input
            id="workStart"
            name="workStart"
            type="time"
            defaultValue={minutesToClock(schedule.workStartMinutes, "24h")}
          />
        </div>
        <div>
          <Label htmlFor="workEnd">Work end time</Label>
          <Input
            id="workEnd"
            name="workEnd"
            type="time"
            defaultValue={minutesToClock(schedule.workEndMinutes, "24h")}
          />
        </div>
      </div>

      <div>
        <Label>Working days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day.value}
              className="flex h-10 min-w-[3.5rem] cursor-pointer items-center justify-center rounded-xl border border-input px-3 text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="workingDays"
                value={day.value}
                defaultChecked={workingDays.has(day.value)}
                className="sr-only"
              />
              {day.label}
            </label>
          ))}
        </div>
        <FieldError>{state?.fieldErrors?.workingDays}</FieldError>
      </div>

      <SubmitButton pendingLabel="Saving…">Save schedule</SubmitButton>
    </form>
  );
}
