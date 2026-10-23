import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getOrCreateSchedule, getRowsForRange, getUserNow } from "@/lib/data";
import { rowsToCsv } from "@/lib/csv";
import { WEEKDAYS, getZonedNow, minutesToClock, parseWorkingDays, toDateKey } from "@/lib/time";

function download(body: string, filename: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const schedule = await getOrCreateSchedule(user.id);
  const params = req.nextUrl.searchParams;
  const now = getUserNow(user);

  if (params.get("format") === "json") {
    const attendances = await db.attendance.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });
    const workingDays = parseWorkingDays(schedule.workingDays);
    const data = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user.name,
        email: user.email,
        signInMethods: [user.passwordHash && "password", user.googleId && "google"].filter(Boolean),
        timeFormat: user.timeFormat,
        theme: user.theme,
        timezone: user.timezone,
        createdAt: user.createdAt.toISOString(),
      },
      schedule: {
        expectedDailyMinutes: schedule.expectedDailyMinutes,
        halfDayMinutes: schedule.halfDayMinutes,
        workStart: minutesToClock(schedule.workStartMinutes, "24h"),
        workEnd: minutesToClock(schedule.workEndMinutes, "24h"),
        workingDays: WEEKDAYS.filter((_, i) => workingDays.has(i)),
      },
      attendance: attendances.map((a) => ({
        date: toDateKey(a.date),
        entry: a.entryMinutes != null ? minutesToClock(a.entryMinutes, "24h") : null,
        out: a.outMinutes != null ? minutesToClock(a.outMinutes, "24h") : null,
        isHalfDay: a.isHalfDay,
        leaveType: a.leaveType,
      })),
    };
    return download(
      JSON.stringify(data, null, 2),
      `office-time-tracker-${now.dateKey}.json`,
      "application/json"
    );
  }

  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  const hasYear = params.has("year") && Number.isInteger(year) && year >= 2000 && year <= 2100;
  const hasMonth = hasYear && params.has("month") && Number.isInteger(month) && month >= 0 && month <= 11;

  let rangeStart: Date;
  let rangeEnd: Date;
  let filename: string;
  if (hasMonth) {
    rangeStart = new Date(Date.UTC(year, month, 1));
    rangeEnd = new Date(Date.UTC(year, month + 1, 0));
    filename = `office-time-${year}-${String(month + 1).padStart(2, "0")}.csv`;
  } else if (hasYear) {
    rangeStart = new Date(Date.UTC(year, 0, 1));
    rangeEnd = new Date(Date.UTC(year, 11, 31));
    filename = `office-time-${year}.csv`;
  } else {
    // Full history: from the first recorded day (or signup) through today.
    const first = await db.attendance.findFirst({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });
    const signup = getZonedNow(user.timezone, user.createdAt).date;
    rangeStart = first && first.date < signup ? first.date : signup;
    rangeEnd = now.date;
    filename = `office-time-all-${now.dateKey}.csv`;
  }

  // Upcoming days are left out, except leave already planned for them.
  const rows = (await getRowsForRange(user, schedule, rangeStart, rangeEnd)).filter(
    (r) => r.status !== "future"
  );
  return download(rowsToCsv(rows), filename, "text/csv");
}
