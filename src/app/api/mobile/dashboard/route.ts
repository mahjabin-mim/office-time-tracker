import {
  getMonthRows,
  getOrCreateSchedule,
  getRecentRows,
  getRowsForRange,
  getUserNow,
} from "@/lib/data";
import { summarizeRows } from "@/lib/calendar";
import { addDays } from "@/lib/time";
import {
  json,
  serializeRow,
  serializeSchedule,
  serializeUser,
  withMobileUser,
} from "@/lib/mobile-api";

/** Everything the app's Today tab shows, in one request. */
export const GET = withMobileUser(async (_req, user) => {
  const schedule = await getOrCreateSchedule(user.id);
  const now = getUserNow(user);
  const monthRows = await getMonthRows(user, schedule, now.year, now.month);
  const recentRows = await getRecentRows(user, schedule, 10);
  const today = monthRows.find((r) => r.isToday)!;
  // The next week, so the app can schedule clock-in reminders that skip planned leave.
  const upcomingRows = await getRowsForRange(
    user,
    schedule,
    addDays(now.date, 1),
    addDays(now.date, 7)
  );

  return json({
    user: serializeUser(user),
    schedule: serializeSchedule(schedule),
    now: { dateKey: now.dateKey, year: now.year, month: now.month, minutes: now.minutes },
    today: serializeRow(today),
    monthSummary: summarizeRows(monthRows),
    recent: recentRows.reverse().map(serializeRow),
    upcoming: upcomingRows.map(serializeRow),
  });
});
