"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { completeSetupAction } from "@/lib/actions/setup";
import {
  SETUP_DAY_PRESETS,
  SETUP_HOUR_PRESETS,
  SETUP_START_PRESETS,
  scheduleFromSetup,
  suggestedLateAfter,
} from "@/lib/setup";
import {
  DeviceNotifications,
  REMINDER_PREFS,
  ReminderOption,
  RemindersLockedNote,
  type DeviceState,
  type ReminderPrefs,
} from "@/components/settings/ReminderSettings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/cn";
import { WEEKDAYS, clockToMinutes, minutesToClock, minutesToDuration, type TimeFormat } from "@/lib/time";

/** The two-step "Set up your workday" screen that has to be finished before the dashboard opens. */
export function WorkdaySetup({
  firstName,
  vapidPublicKey,
  savedReminders,
}: {
  firstName: string;
  vapidPublicKey: string | null;
  savedReminders: ReminderPrefs;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [startChoice, setStartChoice] = useState<number | "other" | null>(null);
  const [otherStart, setOtherStart] = useState<number | null>(null);
  const [hoursChoice, setHoursChoice] = useState<number | "other" | null>(null);
  const [otherHours, setOtherHours] = useState("");
  const [lateChoice, setLateChoice] = useState<"off" | "suggested" | "other" | null>(null);
  const [otherLate, setOtherLate] = useState<number | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat | null>(null);
  const [deviceFormat, setDeviceFormat] = useState<TimeFormat>("12h");
  const [device, setDevice] = useState<DeviceState>("checking");
  const [reminders, setReminders] = useState<ReminderPrefs>(savedReminders);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Times are shown in this device's clock style until the user picks one.
  useEffect(() => {
    const hourCycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
    if (hourCycle === "h23" || hourCycle === "h24") setDeviceFormat("24h");
  }, []);

  const workingDays: number[] =
    dayChoice === "custom"
      ? customDays
      : [...(SETUP_DAY_PRESETS.find((preset) => preset.id === dayChoice)?.days ?? [])];
  const workStartMinutes = startChoice === "other" ? otherStart : startChoice;
  const otherHoursValue = Number(otherHours);
  const expectedDailyMinutes =
    hoursChoice === "other"
      ? otherHours && otherHoursValue >= 1 && otherHoursValue <= 24
        ? Math.round(otherHoursValue * 60)
        : null
      : hoursChoice != null
      ? hoursChoice * 60
      : null;
  const schedule =
    workingDays.length > 0 && workStartMinutes != null && expectedDailyMinutes != null
      ? scheduleFromSetup({ workingDays, workStartMinutes, expectedDailyMinutes })
      : null;
  const lateAfterMinutes =
    lateChoice === "suggested" && workStartMinutes != null
      ? suggestedLateAfter(workStartMinutes)
      : lateChoice === "other"
      ? otherLate
      : null;
  // Every question needs an answer; "Don't track" counts as one.
  const stepTwoDone =
    lateChoice != null && (lateChoice !== "other" || otherLate != null) && timeFormat != null;
  const clock = (minutes: number) => minutesToClock(minutes, timeFormat ?? deviceFormat);

  function finish() {
    if (!schedule || !stepTwoDone || !timeFormat) return;
    setError(null);
    startSaving(async () => {
      const result = await completeSetupAction({
        workingDays,
        workStartMinutes: schedule.workStartMinutes,
        expectedDailyMinutes: schedule.expectedDailyMinutes,
        lateAfterMinutes,
        timeFormat,
        // Reminders can only be chosen once notifications are on; otherwise they're left as they are.
        reminders: device === "on" ? reminders : null,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Step {step} of 2
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log out
          </button>
        </form>
      </div>

      {step === 1 ? (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Set up your workday</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hi {firstName}, this decides your expected hours and daily balance. Choose yours before
            you start recording time; it takes a few seconds.
          </p>

          <div className="mt-6 space-y-6">
            <Question label="Which days do you work?">
              {SETUP_DAY_PRESETS.map((preset) => (
                <Choice
                  key={preset.id}
                  selected={dayChoice === preset.id}
                  onClick={() => setDayChoice(preset.id)}
                >
                  {preset.label}
                </Choice>
              ))}
              <Choice selected={dayChoice === "custom"} onClick={() => setDayChoice("custom")}>
                Custom
              </Choice>
            </Question>
            {dayChoice === "custom" && (
              <div className="-mt-3 flex flex-wrap gap-2">
                {WEEKDAYS.map((day, index) => (
                  <Choice
                    key={day}
                    selected={customDays.includes(index)}
                    onClick={() =>
                      setCustomDays((days) =>
                        days.includes(index) ? days.filter((d) => d !== index) : [...days, index]
                      )
                    }
                  >
                    {day.slice(0, 3)}
                  </Choice>
                ))}
              </div>
            )}

            <Question label="When do you usually start?">
              {SETUP_START_PRESETS.map((minutes) => (
                <Choice
                  key={minutes}
                  selected={startChoice === minutes}
                  onClick={() => setStartChoice(minutes)}
                >
                  {clock(minutes)}
                </Choice>
              ))}
              <Choice selected={startChoice === "other"} onClick={() => setStartChoice("other")}>
                Other
              </Choice>
            </Question>
            {startChoice === "other" && (
              <Input
                type="time"
                aria-label="Start time"
                className="-mt-3 max-w-[12rem]"
                defaultValue={otherStart != null ? minutesToClock(otherStart, "24h") : ""}
                onChange={(e) => setOtherStart(clockToMinutes(e.target.value))}
              />
            )}

            <Question label="How many hours is your workday?">
              {SETUP_HOUR_PRESETS.map((hours) => (
                <Choice
                  key={hours}
                  selected={hoursChoice === hours}
                  onClick={() => setHoursChoice(hours)}
                >
                  {hours} hours
                </Choice>
              ))}
              <Choice selected={hoursChoice === "other"} onClick={() => setHoursChoice("other")}>
                Other
              </Choice>
            </Question>
            {hoursChoice === "other" && (
              <Input
                type="number"
                inputMode="decimal"
                aria-label="Hours per day"
                placeholder="e.g. 7.5"
                step={0.25}
                min={1}
                max={24}
                className="-mt-3 max-w-[12rem]"
                value={otherHours}
                onChange={(e) => setOtherHours(e.target.value)}
              />
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
            {schedule ? (
              <>
                You&apos;ll work{" "}
                <span className="font-semibold">{minutesToDuration(schedule.expectedDailyMinutes)}</span>{" "}
                a day, {describeDays(workingDays)}, from{" "}
                <span className="font-semibold">{clock(schedule.workStartMinutes)}</span> to{" "}
                <span className="font-semibold">{clock(schedule.workEndMinutes)}</span>.
              </>
            ) : (
              <span className="text-muted-foreground">Answer all three to see your workday.</span>
            )}
          </div>

          <Button className="mt-6 w-full" size="lg" disabled={!schedule} onClick={() => setStep(2)}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Almost done</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer the first two to finish; reminders are optional. You can change all of this later
            in Settings.
          </p>

          <div className="mt-6 space-y-6">
            <Question label="Mark late entries?">
              <Choice selected={lateChoice === "off"} onClick={() => setLateChoice("off")}>
                Don&apos;t track
              </Choice>
              {workStartMinutes != null && (
                <Choice selected={lateChoice === "suggested"} onClick={() => setLateChoice("suggested")}>
                  After {clock(suggestedLateAfter(workStartMinutes))}
                </Choice>
              )}
              <Choice selected={lateChoice === "other"} onClick={() => setLateChoice("other")}>
                Other time
              </Choice>
            </Question>
            {lateChoice === "other" && (
              <Input
                type="time"
                aria-label="Late after"
                className="-mt-3 max-w-[12rem]"
                defaultValue={otherLate != null ? minutesToClock(otherLate, "24h") : ""}
                onChange={(e) => setOtherLate(clockToMinutes(e.target.value))}
              />
            )}

            <Question label="How should times look?">
              <Choice selected={timeFormat === "12h"} onClick={() => setTimeFormat("12h")}>
                12-hour · {minutesToClock(17 * 60 + 30, "12h")}
              </Choice>
              <Choice selected={timeFormat === "24h"} onClick={() => setTimeFormat("24h")}>
                24-hour · {minutesToClock(17 * 60 + 30, "24h")}
              </Choice>
            </Question>

            <div>
              <p className="mb-2 text-sm font-medium">
                Reminders <span className="font-normal text-muted-foreground">· optional</span>
              </p>
              <div className="space-y-3">
                <DeviceNotifications vapidPublicKey={vapidPublicKey} onChange={setDevice} />
                <RemindersLockedNote device={device} />
                <fieldset disabled={device !== "on"} className="group min-w-0 space-y-2 disabled:opacity-50">
                  {REMINDER_PREFS.map((pref) => (
                    <ReminderOption
                      key={pref.name}
                      pref={pref}
                      checked={reminders[pref.name]}
                      onChange={(e) => setReminders((r) => ({ ...r, [pref.name]: e.target.checked }))}
                    />
                  ))}
                </fieldset>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6">
              <Alert>{error}</Alert>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={saving}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={finish}
              disabled={saving || !stepTwoDone}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Finish setup"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-10 min-w-[3.5rem] items-center justify-center rounded-xl border px-3.5 text-sm font-medium transition-colors",
        selected
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-input text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

/** "Sun – Thu" for a preset, otherwise the days themselves ("Mon, Wed, Fri"). */
function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const preset = SETUP_DAY_PRESETS.find(
    (p) => p.days.length === sorted.length && p.days.every((d, i) => d === sorted[i])
  );
  return preset ? preset.label : sorted.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ");
}
