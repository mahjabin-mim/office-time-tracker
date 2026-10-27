import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_SCHEDULE } from "@/lib/data";
import { buildDayRows } from "@/lib/calendar";
import { claimReminder, isPushConfigured, sendPushToUser } from "@/lib/push";
import { dueReminders } from "@/lib/reminders";
import { settleExtraSessions } from "@/lib/extra";
import { getZonedNow } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Checks every user with notifications enabled and sends any reminders that are due. Meant to be
 * called every few minutes by a scheduler with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!isPushConfigured()) {
    return Response.json({ error: "VAPID keys are not configured" }, { status: 503 });
  }

  const users = await db.user.findMany({
    where: {
      pushSubscriptions: { some: {} },
      OR: [{ remindClockIn: true }, { remindLeave: true }, { remindClockOut: true }],
    },
    include: { schedule: true },
  });

  let sent = 0;
  for (const user of users) {
    const schedule = user.schedule ?? DEFAULT_SCHEDULE;
    const now = getZonedNow(user.timezone);
    // Carry any extra-hours session left open past midnight, so it's seen as running today.
    await settleExtraSessions(user.id, now);
    const record = await db.attendance.findUnique({
      where: { userId_date: { userId: user.id, date: now.date } },
    });
    const [today] = buildDayRows({
      rangeStart: now.date,
      rangeEnd: now.date,
      records: record ? [record] : [],
      schedule,
      now,
    });

    const due = dueReminders({
      today,
      now,
      prefs: user,
      workStartMinutes: schedule.workStartMinutes,
      workEndMinutes: schedule.workEndMinutes,
    });
    for (const reminder of due) {
      if (!(await claimReminder(user.id, now.dateKey, reminder.kind))) continue;
      sent += await sendPushToUser(user.id, {
        title: reminder.title,
        body: reminder.body,
        tag: `${reminder.kind}-${now.dateKey}`,
        url: "/dashboard",
      });
    }
  }

  return Response.json({ checked: users.length, sent });
}
