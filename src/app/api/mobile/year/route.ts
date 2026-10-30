import { getOrCreateSchedule, getUserNow, getYearRows } from "@/lib/data";
import { summarizeByMonth, summarizeRows } from "@/lib/calendar";
import { parsePeriod } from "@/lib/period";
import { json, withMobileUser } from "@/lib/mobile-api";

export const GET = withMobileUser(async (req, user) => {
  const schedule = await getOrCreateSchedule(user.id);
  const now = getUserNow(user);
  const { year } = parsePeriod({ year: req.nextUrl.searchParams.get("year") ?? undefined }, now);
  const rows = await getYearRows(user, schedule, year);

  return json({ year, summary: summarizeRows(rows), months: summarizeByMonth(rows) });
});
