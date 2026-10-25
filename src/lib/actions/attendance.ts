"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { clockToMinutes, dateKeyToDate, getZonedNow } from "@/lib/time";
import { attendanceSchema } from "@/lib/validation";
import { settleExtraSessions } from "@/lib/extra";

export type AttendanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

async function getNowForUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return getZonedNow(user?.timezone);
}

function revalidateAttendanceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
  revalidatePath("/dashboard/yearly");
}

export async function saveAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  const userId = await requireUserId();

  const raw = {
    date: String(formData.get("date") ?? ""),
    dayType: String(formData.get("dayType") ?? "work"),
    entryTime: String(formData.get("entryTime") ?? ""),
    outTime: String(formData.get("outTime") ?? ""),
    isHalfDay: formData.get("isHalfDay") === "on",
    extraEntryTime: String(formData.get("extraEntryTime") ?? ""),
    extraOutTime: String(formData.get("extraOutTime") ?? ""),
  };

  const parsed = attendanceSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const leaveType = parsed.data.dayType === "work" ? null : parsed.data.dayType;
  const nowForUser = await getNowForUser(userId);
  const hasExtra = !!parsed.data.extraEntryTime;
  if ((!leaveType || hasExtra) && parsed.data.date > nowForUser.dateKey) {
    return {
      error: hasExtra
        ? "Extra hours can't be added to a future day."
        : "Future days can only be marked as leave or a holiday.",
    };
  }
  // An open session on a past day would be carried forward automatically, so it needs an end.
  if (hasExtra && !parsed.data.extraOutTime && parsed.data.date !== nowForUser.dateKey) {
    return { fieldErrors: { extraOutTime: "Add an out time for a past day" } };
  }

  // Leave days don't keep times, so switching a day to leave clears them.
  const entryMinutes =
    !leaveType && parsed.data.entryTime ? clockToMinutes(parsed.data.entryTime) : null;
  const outMinutes = !leaveType && parsed.data.outTime ? clockToMinutes(parsed.data.outTime) : null;
  const isHalfDay = !leaveType && parsed.data.isHalfDay;
  const date = dateKeyToDate(parsed.data.date);
  // Extra hours are their own session and survive a day being switched to leave or a holiday.
  const extraEntryMinutes = parsed.data.extraEntryTime
    ? clockToMinutes(parsed.data.extraEntryTime)
    : null;
  const extraOutMinutes =
    extraEntryMinutes != null && parsed.data.extraOutTime
      ? clockToMinutes(parsed.data.extraOutTime)
      : null;

  await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      entryMinutes,
      outMinutes,
      isHalfDay,
      leaveType,
      extraEntryMinutes,
      extraOutMinutes,
    },
    update: { entryMinutes, outMinutes, isHalfDay, leaveType, extraEntryMinutes, extraOutMinutes },
  });

  revalidateAttendanceViews();
  return { success: true };
}

/** One-tap clock: records the current time as today's entry, or as its out time once clocked in. */
export async function clockAction(_prevState: AttendanceFormState): Promise<AttendanceFormState> {
  const userId = await requireUserId();
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

  revalidateAttendanceViews();
  return { success: true };
}

/** One-tap clock for extra hours: starts today's extra session, or ends it once it is running. */
export async function clockExtraAction(
  _prevState: AttendanceFormState
): Promise<AttendanceFormState> {
  const userId = await requireUserId();
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

  revalidateAttendanceViews();
  return { success: true };
}

export async function deleteAttendanceAction(dateKey: string): Promise<void> {
  const userId = await requireUserId();
  const date = dateKeyToDate(dateKey);

  await db.attendance
    .delete({ where: { userId_date: { userId, date } } })
    .catch(() => null);

  revalidateAttendanceViews();
}
