import "server-only";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { buildDayRows, type DayRow } from "@/lib/calendar";
import { DEFAULT_HALF_DAY_MINUTES, addDays, getZonedNow } from "@/lib/time";
import { redirect } from "next/navigation";
import type { User, WorkSchedule } from "@prisma/client";

export type { DayRow, PeriodSummary } from "@/lib/calendar";
export { summarizeRows } from "@/lib/calendar";

export async function getCurrentUser() {
  return getAuthenticatedUser();
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    // A revoked or orphaned cookie still passes the middleware's signature check, so it has to
    // be cleared (which only a route handler can do) or /login would bounce back here forever.
    redirect((await getSession()) ? "/api/auth/signout" : "/login");
  }
  return user;
}

export const DEFAULT_SCHEDULE = {
  expectedDailyMinutes: 540,
  breakMinutes: 60,
  halfDayMinutes: DEFAULT_HALF_DAY_MINUTES,
  workStartMinutes: 540,
  workEndMinutes: 1140,
  workingDays: "0,1,2,3,4",
};

export async function getOrCreateSchedule(userId: string): Promise<WorkSchedule> {
  const existing = await db.workSchedule.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.workSchedule.create({ data: { userId, ...DEFAULT_SCHEDULE } });
}

/** The current date and time where the user is, rather than where the server is. */
export function getUserNow(user: Pick<User, "timezone">) {
  return getZonedNow(user.timezone);
}

export async function getRowsForRange(
  user: User,
  schedule: WorkSchedule,
  rangeStart: Date,
  rangeEnd: Date
): Promise<DayRow[]> {
  const records = await db.attendance.findMany({
    where: {
      userId: user.id,
      date: { gte: rangeStart, lte: rangeEnd },
    },
  });

  return buildDayRows({
    rangeStart,
    rangeEnd,
    records,
    schedule,
    now: getUserNow(user),
    trackingStartKey: getZonedNow(user.timezone, user.createdAt).dateKey,
  });
}

export async function getMonthRows(
  user: User,
  schedule: WorkSchedule,
  year: number,
  month: number // 0-indexed
): Promise<DayRow[]> {
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  return getRowsForRange(user, schedule, monthStart, monthEnd);
}

export async function getYearRows(
  user: User,
  schedule: WorkSchedule,
  year: number
): Promise<DayRow[]> {
  return getRowsForRange(
    user,
    schedule,
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year, 11, 31))
  );
}

export async function getRecentRows(
  user: User,
  schedule: WorkSchedule,
  days: number
): Promise<DayRow[]> {
  const today = getUserNow(user).date;
  return getRowsForRange(user, schedule, addDays(today, -(days - 1)), today);
}
