import { halfDayMinutesFor } from "@/lib/time";
import type { SetupChoices } from "@/lib/validation";

/** One-tap answers on the "Set up your workday" screen; "Custom" covers everything else. */
export const SETUP_DAY_PRESETS = [
  { id: "sun-thu", label: "Sun – Thu", days: [0, 1, 2, 3, 4] },
  { id: "mon-fri", label: "Mon – Fri", days: [1, 2, 3, 4, 5] },
] as const;
export const SETUP_START_PRESETS = [8 * 60, 9 * 60, 10 * 60];
export const SETUP_HOUR_PRESETS = [8, 9];

/**
 * The working schedule a finished setup saves. The day ends once the daily hours are worked, and
 * a half day is half of them; both can still be changed in Settings.
 */
export function scheduleFromSetup(
  choices: Pick<SetupChoices, "workingDays" | "workStartMinutes" | "expectedDailyMinutes">
) {
  return {
    expectedDailyMinutes: choices.expectedDailyMinutes,
    halfDayMinutes: halfDayMinutesFor(choices.expectedDailyMinutes),
    workStartMinutes: choices.workStartMinutes,
    // Capped at midnight: the end time only decides when the "forgot to clock in" reminder stops.
    workEndMinutes: Math.min(choices.workStartMinutes + choices.expectedDailyMinutes, 1439),
    workingDays: [...new Set(choices.workingDays)].sort((a, b) => a - b).join(","),
  };
}

/**
 * Whether the user still has to choose their working schedule; nothing can be recorded until they
 * do. New accounts are flagged when they're created. Older accounts count as set up once their
 * schedule has been saved: Prisma stamps both times alike on create, and every save moves
 * updatedAt, so equal times mean the default schedule was never touched.
 */
export function needsWorkdaySetup(
  user: { needsSetup: boolean },
  schedule: { createdAt: Date; updatedAt: Date } | null
): boolean {
  return user.needsSetup || !schedule || schedule.updatedAt.getTime() === schedule.createdAt.getTime();
}

/** The "late after" time offered first: half an hour after the work start. */
export function suggestedLateAfter(workStartMinutes: number): number {
  return Math.min(workStartMinutes + 30, 1439);
}
