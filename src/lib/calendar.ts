import {
  addDays,
  computeDayStatus,
  computeExtra,
  isLateEntry,
  isLeaveType,
  isWorkingDay,
  parseWorkingDays,
  toDateKey,
  type DayStatus,
  type LeaveType,
  type ZonedNow,
} from "@/lib/time";

export interface ScheduleLike {
  expectedDailyMinutes: number;
  halfDayMinutes: number;
  workingDays: string;
  lateAfterMinutes?: number | null;
}

export interface AttendanceLike {
  date: Date;
  entryMinutes: number | null;
  outMinutes: number | null;
  isHalfDay: boolean;
  leaveType: string | null;
  extraEntryMinutes?: number | null;
  extraOutMinutes?: number | null;
}

export interface DayRow {
  date: Date;
  dateKey: string;
  entryMinutes: number | null;
  outMinutes: number | null;
  isHalfDay: boolean;
  leaveType: LeaveType | null;
  extraEntryMinutes: number | null;
  extraOutMinutes: number | null;
  /** Extra-hours time: completed, or running so far while a session is open today. */
  extraMinutes: number | null;
  extraInProgress: boolean;
  /** Entered after the late-entry time from settings (working days only, never on leave). */
  isLate: boolean;
  isToday: boolean;
  isFuture: boolean;
  isWorkingDay: boolean;
  status: DayStatus;
  workedMinutes: number | null;
  expectedMinutes: number;
  differenceMinutes: number | null;
}

/** One row per calendar day in [rangeStart, rangeEnd], computed against the user's schedule. */
export function buildDayRows(params: {
  rangeStart: Date;
  rangeEnd: Date;
  records: AttendanceLike[];
  schedule: ScheduleLike;
  now: ZonedNow;
  trackingStartKey?: string;
}): DayRow[] {
  const { schedule, now } = params;
  const workingDaysSet = parseWorkingDays(schedule.workingDays);
  const byKey = new Map(params.records.map((r) => [toDateKey(r.date), r]));

  const rows: DayRow[] = [];
  for (let date = params.rangeStart; date <= params.rangeEnd; date = addDays(date, 1)) {
    const dateKey = toDateKey(date);
    const record = byKey.get(dateKey);
    const leaveType = isLeaveType(record?.leaveType) ? record.leaveType : null;
    const working = isWorkingDay(date, workingDaysSet);
    const computation = computeDayStatus({
      dateKey,
      todayKey: now.dateKey,
      nowMinutes: now.minutes,
      isWorking: working,
      entryMinutes: record?.entryMinutes,
      outMinutes: record?.outMinutes,
      expectedDailyMinutes: schedule.expectedDailyMinutes,
      isHalfDay: record?.isHalfDay,
      halfDayMinutes: schedule.halfDayMinutes,
      leaveType,
      trackingStartKey: params.trackingStartKey,
    });
    const extra = computeExtra({
      dateKey,
      todayKey: now.dateKey,
      nowMinutes: now.minutes,
      extraEntryMinutes: record?.extraEntryMinutes,
      extraOutMinutes: record?.extraOutMinutes,
    });
    rows.push({
      date,
      dateKey,
      entryMinutes: record?.entryMinutes ?? null,
      outMinutes: record?.outMinutes ?? null,
      isHalfDay: record?.isHalfDay ?? false,
      leaveType,
      extraEntryMinutes: record?.extraEntryMinutes ?? null,
      extraOutMinutes: record?.extraOutMinutes ?? null,
      extraMinutes: extra.minutes,
      extraInProgress: extra.inProgress,
      isLate: working && !leaveType && isLateEntry(record?.entryMinutes, schedule.lateAfterMinutes),
      isToday: dateKey === now.dateKey,
      isFuture: dateKey > now.dateKey,
      isWorkingDay: working,
      status: computation.status,
      workedMinutes: computation.workedMinutes,
      expectedMinutes: computation.expectedMinutes,
      differenceMinutes: computation.differenceMinutes,
    });
  }
  return rows;
}

export interface PeriodSummary {
  balanceMinutes: number;
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  totalExtraMinutes: number;
  totalLessMinutes: number;
  /** Completed extra-hours sessions; already included in totalExtraMinutes and the balance. */
  totalExtraHourMinutes: number;
  workingDaysCount: number;
  daysCompletedCount: number;
  daysMissingCount: number;
  /** Non-working days with time recorded; all of it counted as extra. */
  daysOffWorkedCount: number;
  halfDaysCount: number;
  leaveDaysCount: number;
  lateEntriesCount: number;
  averageMinutesPerDay: number;
}

export function summarizeRows(rows: DayRow[]): PeriodSummary {
  let totalWorked = 0;
  let totalExpected = 0;
  let totalExtra = 0;
  let totalLess = 0;
  let totalExtraHours = 0;
  let workingDays = 0;
  let daysCompleted = 0;
  let daysMissing = 0;
  let daysOffWorked = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let lateEntries = 0;

  for (const row of rows) {
    if (row.isLate) lateEntries += 1;

    // Extra-hours sessions count on any day (leave, holiday and days off included), once finished.
    if (row.extraMinutes != null && !row.extraInProgress) totalExtraHours += row.extraMinutes;

    // Planned leave counts too, but only when it replaces a working day.
    if (row.status === "leave") {
      if (row.isWorkingDay) leaveDays += 1;
      continue;
    }
    if (row.status === "non-working" || row.status === "future" || row.status === "not-tracked") {
      continue;
    }

    if (row.isWorkingDay) {
      workingDays += 1;
      if (row.isHalfDay) halfDays += 1;
    }

    if (row.status === "missing" || row.status === "incomplete") {
      if (row.isWorkingDay) daysMissing += 1;
      continue;
    }

    if (row.status === "in-progress") continue;

    if (row.isWorkingDay) daysCompleted += 1;
    else daysOffWorked += 1;
    totalWorked += row.workedMinutes ?? 0;
    totalExpected += row.expectedMinutes;
    const diff = row.differenceMinutes ?? 0;
    if (diff > 0) totalExtra += diff;
    if (diff < 0) totalLess += Math.abs(diff);
  }

  totalExtra += totalExtraHours;

  return {
    balanceMinutes: totalExtra - totalLess,
    totalWorkedMinutes: totalWorked,
    totalExpectedMinutes: totalExpected,
    totalExtraMinutes: totalExtra,
    totalLessMinutes: totalLess,
    totalExtraHourMinutes: totalExtraHours,
    workingDaysCount: workingDays,
    daysCompletedCount: daysCompleted,
    daysMissingCount: daysMissing,
    daysOffWorkedCount: daysOffWorked,
    halfDaysCount: halfDays,
    leaveDaysCount: leaveDays,
    lateEntriesCount: lateEntries,
    averageMinutesPerDay:
      daysCompleted + daysOffWorked > 0 ? totalWorked / (daysCompleted + daysOffWorked) : 0,
  };
}

export interface MonthBreakdown {
  /** 0-indexed */
  month: number;
  summary: PeriodSummary;
  /** False for months entirely in the future or before tracking started. */
  hasData: boolean;
}

export function summarizeByMonth(rows: DayRow[]): MonthBreakdown[] {
  return Array.from({ length: 12 }, (_, month) => {
    const monthRows = rows.filter((r) => r.date.getUTCMonth() === month);
    const summary = summarizeRows(monthRows);
    const hasData = monthRows.some(
      (r) =>
        (r.status !== "future" && r.status !== "not-tracked" && r.status !== "non-working") ||
        r.extraMinutes != null
    );
    return { month, summary, hasData };
  });
}

/** Wall-clock minute at which the expected time for an in-progress day is reached. */
export function leaveAtMinutes(row: Pick<DayRow, "entryMinutes" | "expectedMinutes">) {
  return row.entryMinutes != null ? row.entryMinutes + row.expectedMinutes : null;
}
