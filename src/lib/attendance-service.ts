import "server-only";
import { db } from "@/lib/db";
import { clockToMinutes, dateKeyToDate, getZonedNow } from "@/lib/time";
import { attendanceSchema, extraHoursSchema } from "@/lib/validation";
import { settleExtraSessions } from "@/lib/extra";
import { userNeedsSetup } from "@/lib/data";

/** Shared by the web Server Actions and the mobile API, so both apply the same rules. */
export type AttendanceResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Nothing is recorded until the user has chosen their own schedule, so balances never use the default. */
async function setupMissing(userId: string): Promise<AttendanceResult> {
  return (await userNeedsSetup(userId))
    ? { error: "Set your working days and hours in Settings before recording time." }
    : null;
}

async function getNowForUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return getZonedNow(user?.timezone);
}

export async function saveAttendance(
  userId: string,
  raw: {
    date: string;
    dayType: string;
    entryTime: string;
    outTime: string;
    isHalfDay: boolean;
  }
): Promise<AttendanceResult> {
  const missing = await setupMissing(userId);
  if (missing) return missing;
  const parsed = attendanceSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const leaveType = parsed.data.dayType === "work" ? null : parsed.data.dayType;
  if (!leaveType && parsed.data.date > (await getNowForUser(userId)).dateKey) {
    return { error: "Future days can only be marked as leave or a holiday." };
  }

  // Leave days don't keep times, so switching a day to leave clears them.
  const entryMinutes =
    !leaveType && parsed.data.entryTime ? clockToMinutes(parsed.data.entryTime) : null;
  const outMinutes = !leaveType && parsed.data.outTime ? clockToMinutes(parsed.data.outTime) : null;
  const isHalfDay = !leaveType && parsed.data.isHalfDay;
  const date = dateKeyToDate(parsed.data.date);

  // Extra hours are saved separately, so they're left untouched here.
  await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, entryMinutes, outMinutes, isHalfDay, leaveType },
    update: { entryMinutes, outMinutes, isHalfDay, leaveType },
  });

  return { success: true };
}

/** One-tap clock: records the current time as today's entry, or as its out time once clocked in. */
export async function clockAttendance(userId: string): Promise<AttendanceResult> {
  const missing = await setupMissing(userId);
  if (missing) return missing;
  const now = await getNowForUser(userId);
  const where = { userId_date: { userId, date: now.date } };
  const today = await db.attendance.findUnique({ where });

  if (!today || today.entryMinutes == null) {
    await db.attendance.upsert({
      where,
      create: { userId, date: now.date, entryMinutes: now.minutes },
      update: { entryMinutes: now.minutes, leaveType: null },
    });
  } else if (today.outMinutes == null) {
    // Equal times would be read as a 24-hour overnight shift.
    if (now.minutes === today.entryMinutes) {
      return { error: "You clocked in less than a minute ago." };
    }
    await db.attendance.update({ where, data: { outMinutes: now.minutes } });
  } else {
    return { error: "You've already clocked out today. Use Edit to change your times." };
  }

  return { success: true };
}

/** Saves a day's extra-hours session. */
export async function saveExtraHours(
  userId: string,
  raw: { date: string; extraEntryTime: string; extraOutTime: string }
): Promise<AttendanceResult> {
  const missing = await setupMissing(userId);
  if (missing) return missing;
  const parsed = extraHoursSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const today = (await getNowForUser(userId)).dateKey;
  if (parsed.data.date > today) return { error: "Extra hours can't be added to a future day." };
  // An open session on a past day would be carried forward automatically, so it needs an end.
  if (!parsed.data.extraOutTime && parsed.data.date !== today) {
    return { fieldErrors: { extraOutTime: "Add an out time for a past day" } };
  }

  const extraEntryMinutes = clockToMinutes(parsed.data.extraEntryTime!);
  const extraOutMinutes = parsed.data.extraOutTime ? clockToMinutes(parsed.data.extraOutTime) : null;
  const date = dateKeyToDate(parsed.data.date);

  await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, extraEntryMinutes, extraOutMinutes },
    update: { extraEntryMinutes, extraOutMinutes },
  });

  return { success: true };
}

/** Removes a day's extra-hours session and leaves the rest of the day alone. */
export async function clearExtraHours(userId: string, dateKey: string): Promise<void> {
  const date = dateKeyToDate(dateKey);
  await db.attendance
    .update({
      where: { userId_date: { userId, date } },
      data: { extraEntryMinutes: null, extraOutMinutes: null },
    })
    .catch(() => null);
}

/** One-tap clock for extra hours: starts today's extra session, or ends it once it is running. */
export async function clockExtraHours(userId: string): Promise<AttendanceResult> {
  const missing = await setupMissing(userId);
  if (missing) return missing;
  const now = await getNowForUser(userId);
  await settleExtraSessions(userId, now);
  const where = { userId_date: { userId, date: now.date } };
  const today = await db.attendance.findUnique({ where });

  if (!today || today.extraEntryMinutes == null) {
    await db.attendance.upsert({
      where,
      create: { userId, date: now.date, extraEntryMinutes: now.minutes },
      update: { extraEntryMinutes: now.minutes, extraOutMinutes: null },
    });
  } else if (today.extraOutMinutes == null) {
    if (now.minutes <= today.extraEntryMinutes) {
      return { error: "You started extra hours less than a minute ago." };
    }
    await db.attendance.update({ where, data: { extraOutMinutes: now.minutes } });
  } else {
    return { error: "You've already finished extra hours today. Use Edit to change them." };
  }

  return { success: true };
}

export async function deleteAttendance(userId: string, dateKey: string): Promise<void> {
  const date = dateKeyToDate(dateKey);
  const where = { userId_date: { userId, date } };

  // Extra hours are managed in their own dialog, so clearing the day keeps them.
  const existing = await db.attendance.findUnique({ where });
  if (existing?.extraEntryMinutes != null) {
    await db.attendance.update({
      where,
      data: { entryMinutes: null, outMinutes: null, isHalfDay: false, leaveType: null },
    });
  } else {
    await db.attendance.delete({ where }).catch(() => null);
  }
}
