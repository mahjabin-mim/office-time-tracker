import { leaveAtMinutes, type DayRow } from "@/lib/calendar";
import { minutesToDuration, type ZonedNow } from "@/lib/time";

export const REMINDER_KINDS = ["clock-in", "leave", "clock-out", "extra-running"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export interface Reminder {
  kind: ReminderKind;
  title: string;
  body: string;
}

export interface ReminderPrefs {
  remindClockIn: boolean;
  remindLeave: boolean;
  remindClockOut: boolean;
}

/** How long after the work start time a missing entry triggers a "forgot to clock in?" nudge. */
export const CLOCK_IN_GRACE_MINUTES = 60;
/** How long past the leave time an open day triggers a "forgot to clock out?" nudge. */
export const CLOCK_OUT_GRACE_MINUTES = 120;

/** How long an extra-hours session runs before a "still running?" nudge. */
export const EXTRA_RUNNING_REMINDER_MINUTES = 180;

export function leaveReminder(row: Pick<DayRow, "expectedMinutes">): Reminder {
  return {
    kind: "leave",
    title: "Time to head out 🎉",
    body: `You've completed today's ${minutesToDuration(row.expectedMinutes)}. Clock out when you leave.`,
  };
}

/**
 * Reminders due right now for today's row. Each is time-boxed so a scheduler that was down for
 * a while doesn't send stale nudges late at night.
 */
export function dueReminders(params: {
  today: DayRow;
  now: ZonedNow;
  prefs: ReminderPrefs;
  workStartMinutes: number;
  workEndMinutes: number;
}): Reminder[] {
  const { today, now, prefs } = params;
  if (!today.isToday) return [];

  const reminders: Reminder[] = [];

  // Extra hours can run on any day, so this one isn't limited to regular working days. It shares
  // the "forgot to clock out" preference.
  if (
    prefs.remindClockOut &&
    today.extraInProgress &&
    today.extraMinutes != null &&
    today.extraMinutes >= EXTRA_RUNNING_REMINDER_MINUTES
  ) {
    reminders.push({
      kind: "extra-running",
      title: "Extra hours still running",
      body: `Your extra hours have been running for ${minutesToDuration(today.extraMinutes)}. End them when you're done, or they'll continue past midnight.`,
    });
  }

  // The rest are only for regular working days: not leave, days off, or future-dated rows.
  if (!today.isWorkingDay || today.leaveType) return reminders;

  if (
    prefs.remindClockIn &&
    today.entryMinutes == null &&
    now.minutes >= params.workStartMinutes + CLOCK_IN_GRACE_MINUTES &&
    now.minutes < params.workEndMinutes
  ) {
    reminders.push({
      kind: "clock-in",
      title: "Forgot to clock in?",
      body: "You haven't recorded an entry time today.",
    });
  }

  const leaveAt = leaveAtMinutes(today);
  if (leaveAt != null && today.outMinutes == null) {
    if (
      prefs.remindLeave &&
      now.minutes >= leaveAt &&
      now.minutes < leaveAt + CLOCK_OUT_GRACE_MINUTES
    ) {
      reminders.push(leaveReminder(today));
    }
    if (prefs.remindClockOut && now.minutes >= leaveAt + CLOCK_OUT_GRACE_MINUTES) {
      reminders.push({
        kind: "clock-out",
        title: "Still at work?",
        body: "Don't forget to record your out time for today.",
      });
    }
  }

  return reminders;
}
