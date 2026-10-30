import { getMonthRows, getOrCreateSchedule, getUserNow } from "@/lib/data";
import { summarizeRows } from "@/lib/calendar";
import { parsePeriod } from "@/lib/period";
import { json, serializeRow, serializeSchedule, withMobileUser } from "@/lib/mobile-api";

export const GET = withMobileUser(async (req, user) => {
  const schedule = await getOrCreateSchedule(user.id);
  const params = req.nextUrl.searchParams;
  const { year, month } = parsePeriod(
    { year: params.get("year") ?? undefined, month: params.get("month") ?? undefined },
    getUserNow(user)
  );
  const rows = await getMonthRows(user, schedule, year, month);

  return json({
    year,
    month,
    schedule: serializeSchedule(schedule),
    summary: summarizeRows(rows),
    rows: rows.map(serializeRow),
  });
});
