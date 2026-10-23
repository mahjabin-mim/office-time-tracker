import { leaveAtMinutes, type DayRow } from "@/lib/calendar";
import { minutesToDuration, type ZonedNow } from "@/lib/time";

export const REMINDER_KINDS = ["clock-in", "leave", "clock-out"] as const;
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
  // Only regular working days get reminders: not leave, days off, or future-dated rows.
  if (!today.isToday || !today.isWorkingDay || today.leaveType) return [];

  const reminders: Reminder[] = [];

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
