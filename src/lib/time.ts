export type TimeFormat = "12h" | "24h";

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

/** Returns a date-only key (YYYY-MM-DD) in the local calendar sense. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
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
  return workingDaysSet.has(date.getDay());
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export type DayStatus =
  | "extra"
  | "less"
  | "on-target"
  | "in-progress"
  | "missing"
  | "incomplete"
  | "non-working"
  | "future";

export interface DayComputation {
  status: DayStatus;
  workedMinutes: number | null;
  expectedMinutes: number;
  differenceMinutes: number | null;
  countsTowardBalance: boolean;
}

export function computeDayStatus(params: {
  date: Date;
  today: Date;
  isWorking: boolean;
  entryMinutes: number | null | undefined;
  outMinutes: number | null | undefined;
  expectedDailyMinutes: number;
  breakMinutes: number;
}): DayComputation {
  const { date, today, isWorking, entryMinutes, outMinutes, expectedDailyMinutes, breakMinutes } =
    params;

  const dateKey = toDateKey(date);
  const todayKey = toDateKey(today);
  const isFuture = dateKey > todayKey;
  const isToday = dateKey === todayKey;

  if (isFuture) {
    return {
      status: "future",
      workedMinutes: null,
      expectedMinutes: 0,
      differenceMinutes: null,
      countsTowardBalance: false,
    };
  }

  if (!isWorking) {
    return {
      status: "non-working",
      workedMinutes: null,
      expectedMinutes: 0,
      differenceMinutes: null,
      countsTowardBalance: false,
    };
  }

  const hasEntry = entryMinutes != null;
  const hasOut = outMinutes != null;

  if (!hasEntry && !hasOut) {
    return {
      status: "missing",
      workedMinutes: null,
      expectedMinutes: expectedDailyMinutes,
      differenceMinutes: null,
      countsTowardBalance: false,
    };
  }

  if (hasEntry && !hasOut) {
    if (isToday) {
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const worked = computeWorkedMinutes(entryMinutes, nowMinutes, breakMinutes) ?? 0;
      return {
        status: "in-progress",
        workedMinutes: worked,
        expectedMinutes: expectedDailyMinutes,
        differenceMinutes: worked - expectedDailyMinutes,
        countsTowardBalance: false,
      };
    }
    return {
      status: "incomplete",
      workedMinutes: null,
      expectedMinutes: expectedDailyMinutes,
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
    differenceMinutes: difference,
    countsTowardBalance: true,
  };
}
