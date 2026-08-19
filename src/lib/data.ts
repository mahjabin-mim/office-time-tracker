import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  computeDayStatus,
  isWorkingDay,
  parseWorkingDays,
  toDateKey,
  type DayStatus,
} from "@/lib/time";
import { redirect } from "next/navigation";
import type { User, WorkSchedule } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getOrCreateSchedule(userId: string): Promise<WorkSchedule> {
  const existing = await db.workSchedule.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.workSchedule.create({
    data: {
      userId,
      expectedDailyMinutes: 540,
      breakMinutes: 60,
      workStartMinutes: 540,
      workEndMinutes: 1140,
      workingDays: "0,1,2,3,4",
    },
  });
}

export interface DayRow {
  date: Date;
  dateKey: string;
  entryMinutes: number | null;
  outMinutes: number | null;
  status: DayStatus;
  workedMinutes: number | null;
  expectedMinutes: number;
  differenceMinutes: number | null;
}

async function getRowsForRange(
  user: User,
  schedule: WorkSchedule,
  rangeStart: Date,
  rangeEnd: Date
): Promise<DayRow[]> {
  const now = new Date();
  const workingDaysSet = parseWorkingDays(schedule.workingDays);

  const attendances = await db.attendance.findMany({
    where: {
      userId: user.id,
      date: { gte: rangeStart, lte: rangeEnd },
    },
  });
  const byKey = new Map(attendances.map((a) => [toDateKey(a.date), a]));

  const rows: DayRow[] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const date = new Date(cursor);
    const record = byKey.get(toDateKey(date));
    const computation = computeDayStatus({
      date,
      today: now,
      isWorking: isWorkingDay(date, workingDaysSet),
      entryMinutes: record?.entryMinutes,
      outMinutes: record?.outMinutes,
      expectedDailyMinutes: schedule.expectedDailyMinutes,
      breakMinutes: schedule.breakMinutes,
    });
    rows.push({
      date,
      dateKey: toDateKey(date),
      entryMinutes: record?.entryMinutes ?? null,
      outMinutes: record?.outMinutes ?? null,
      status: computation.status,
      workedMinutes: computation.workedMinutes,
      expectedMinutes: computation.expectedMinutes,
      differenceMinutes: computation.differenceMinutes,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

export async function getMonthRows(
  user: User,
  schedule: WorkSchedule,
  year: number,
  month: number // 0-indexed
): Promise<DayRow[]> {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  return getRowsForRange(user, schedule, monthStart, monthEnd);
}

export async function getRecentRows(
  user: User,
  schedule: WorkSchedule,
  days: number
): Promise<DayRow[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return getRowsForRange(user, schedule, start, today);
}

export interface MonthlySummary {
  balanceMinutes: number;
  totalWorkedMinutes: number;
  totalExpectedMinutes: number;
  totalExtraMinutes: number;
  totalLessMinutes: number;
  workingDaysCount: number;
  daysCompletedCount: number;
  daysMissingCount: number;
  averageMinutesPerDay: number;
}

export function summarizeMonth(rows: DayRow[]): MonthlySummary {
  let totalWorked = 0;
  let totalExpected = 0;
  let totalExtra = 0;
  let totalLess = 0;
  let workingDays = 0;
  let daysCompleted = 0;
  let daysMissing = 0;

  for (const row of rows) {
    if (row.status === "non-working" || row.status === "future") continue;
    workingDays += 1;

    if (row.status === "missing" || row.status === "incomplete") {
      daysMissing += 1;
      continue;
    }

    if (row.status === "in-progress") continue;

    daysCompleted += 1;
    totalWorked += row.workedMinutes ?? 0;
    totalExpected += row.expectedMinutes;
    const diff = row.differenceMinutes ?? 0;
    if (diff > 0) totalExtra += diff;
    if (diff < 0) totalLess += Math.abs(diff);
  }

  return {
    balanceMinutes: totalExtra - totalLess,
    totalWorkedMinutes: totalWorked,
    totalExpectedMinutes: totalExpected,
    totalExtraMinutes: totalExtra,
    totalLessMinutes: totalLess,
    workingDaysCount: workingDays,
    daysCompletedCount: daysCompleted,
    daysMissingCount: daysMissing,
    averageMinutesPerDay: daysCompleted > 0 ? totalWorked / daysCompleted : 0,
  };
}
