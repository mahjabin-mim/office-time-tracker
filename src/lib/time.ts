export type TimeFormat = "12h" | "24h";

/** Default half-day length (4h 30m); each user can change it in their working schedule. */
export const DEFAULT_HALF_DAY_MINUTES = 270;

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const LEAVE_TYPES = ["leave", "sick", "holiday"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_LABELS: Record<LeaveType, string> = {
  leave: "Leave",
  sick: "Sick leave",
  holiday: "Holiday",
};

export function isLeaveType(value: unknown): value is LeaveType {
  return typeof value === "string" && (LEAVE_TYPES as readonly string[]).includes(value);
}

export function minutesToClock(minutes: number, format: TimeFormat = "12h"): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  if (format === "24h") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function clockToMinutes(value: string): number | null {
  // Expects "HH:mm" 24h format (native <input type="time"> value)
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
}

export function minutesToDurationSigned(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
}

export function computeWorkedMinutes(
  entryMinutes: number | null | undefined,
  outMinutes: number | null | undefined,
  breakMinutes: number
): number | null {
  if (entryMinutes == null || outMinutes == null) return null;
  let out = outMinutes;
  if (out <= entryMinutes) {
    // overnight shift: out time rolls into the next day
    out += 1440;
  }
  const worked = out - entryMinutes - breakMinutes;
  return Math.max(0, worked);
}

// Calendar days are represented as UTC midnight, so a given day maps to the same Date on any
// server or browser regardless of its local time zone. Always read them with getUTC*().

/** Returns the date-only key (YYYY-MM-DD) of a calendar day. */
export function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseWorkingDays(workingDays: string): Set<number> {
  return new Set(
    workingDays
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => !Number.isNaN(v))
  );
}

export function isWorkingDay(date: Date, workingDaysSet: Set<number>): boolean {
  return workingDaysSet.has(date.getUTCDay());
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthShort(month: number): string {
  return new Date(Date.UTC(2000, month, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

// --- Time zones -------------------------------------------------------------------------------

/** Used until a user's browser has reported its time zone. */
export const FALLBACK_TIMEZONE = "UTC";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export interface ZonedNow {
  /** Today's calendar day (UTC midnight), as seen in the user's time zone. */
  date: Date;
  dateKey: string;
  year: number;
  /** 0-indexed */
  month: number;
  hour: number;
  /** Minutes since local midnight. */
  minutes: number;
}

/** The current local date and time in a time zone, independent of the server's own zone. */
export function getZonedNow(timeZone: string | null | undefined, at: Date = new Date()): ZonedNow {
  const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  const year = part("year");
  const month = part("month") - 1;
  const hour = part("hour") % 24;
  const date = new Date(Date.UTC(year, month, part("day")));
  return { date, dateKey: toDateKey(date), year, month, hour, minutes: hour * 60 + part("minute") };
}

// --- Day status -------------------------------------------------------------------------------

export type DayStatus =
  | "extra"
  | "less"
  | "on-target"
  | "in-progress"
  | "missing"
  | "incomplete"
  | "non-working"
  | "future"
  | "leave"
  | "not-tracked";

export const STATUS_LABELS: Record<DayStatus, string> = {
  extra: "Extra",
  less: "Less",
  "on-target": "On target",
  "in-progress": "In progress",
  missing: "Missing",
  incomplete: "Incomplete",
  "non-working": "Day off",
  future: "Upcoming",
  leave: "Leave",
  "not-tracked": "Not tracked",
};

export interface DayComputation {
  status: DayStatus;
  workedMinutes: number | null;
  expectedMinutes: number;
  /** Break actually deducted for this day (0 on half days and days off). */
  breakMinutes: number;
  differenceMinutes: number | null;
  countsTowardBalance: boolean;
}

export function computeDayStatus(params: {
  dateKey: string;
  todayKey: string;
  /** Minutes since midnight right now, in the user's time zone. */
  nowMinutes: number;
  isWorking: boolean;
  entryMinutes: number | null | undefined;
  outMinutes: number | null | undefined;
  expectedDailyMinutes: number;
  breakMinutes: number;
  isHalfDay?: boolean;
  halfDayMinutes?: number;
  leaveType?: LeaveType | null;
  /** Days before this key (e.g. the signup date) with nothing recorded aren't counted as missing. */
  trackingStartKey?: string;
}): DayComputation {
  const { dateKey, todayKey, nowMinutes, isWorking, entryMinutes, outMinutes, isHalfDay } = params;

  const idle = (status: DayStatus): DayComputation => ({
    status,
    workedMinutes: null,
    expectedMinutes: 0,
    breakMinutes: 0,
    differenceMinutes: null,
    countsTowardBalance: false,
  });

  // Leave and holidays are never missing or short, whether past, today, or planned ahead.
  if (params.leaveType) return idle("leave");
  if (dateKey > todayKey) return idle("future");

  const hasEntry = entryMinutes != null;
  const hasOut = outMinutes != null;

  if (!hasEntry && !hasOut) {
    if (!isWorking) return idle("non-working");
    if (params.trackingStartKey && dateKey < params.trackingStartKey) return idle("not-tracked");
  }

  // Work on a day off has nothing expected, so every minute worked counts as extra.
  const expectedDailyMinutes = !isWorking
    ? 0
    : isHalfDay
    ? params.halfDayMinutes ?? DEFAULT_HALF_DAY_MINUTES
    : params.expectedDailyMinutes;
  const breakMinutes = !isWorking || isHalfDay ? 0 : params.breakMinutes;

  if (!hasEntry && !hasOut) {
    return {
      status: "missing",
      workedMinutes: null,
      expectedMinutes: expectedDailyMinutes,
      breakMinutes,
      differenceMinutes: null,
      countsTowardBalance: false,
    };
  }

  if (!hasEntry || !hasOut) {
    if (hasEntry && dateKey === todayKey) {
      // An entry at or after the current minute hasn't started yet; it isn't an overnight shift.
      const worked =
        nowMinutes <= entryMinutes
          ? 0
          : computeWorkedMinutes(entryMinutes, nowMinutes, breakMinutes) ?? 0;
      return {
        status: "in-progress",
        workedMinutes: worked,
        expectedMinutes: expectedDailyMinutes,
        breakMinutes,
        differenceMinutes: worked - expectedDailyMinutes,
        countsTowardBalance: false,
      };
    }
    return {
      status: "incomplete",
      workedMinutes: null,
      expectedMinutes: expectedDailyMinutes,
      breakMinutes,
      differenceMinutes: null,
      countsTowardBalance: false,
    };
  }

  const worked = computeWorkedMinutes(entryMinutes, outMinutes, breakMinutes)!;
  const difference = worked - expectedDailyMinutes;
  return {
    status: difference === 0 ? "on-target" : difference > 0 ? "extra" : "less",
    workedMinutes: worked,
    expectedMinutes: expectedDailyMinutes,
    breakMinutes,
    differenceMinutes: difference,
    countsTowardBalance: true,
  };
}
