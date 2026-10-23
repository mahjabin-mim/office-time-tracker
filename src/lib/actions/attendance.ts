"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { clockToMinutes, dateKeyToDate, getZonedNow } from "@/lib/time";
import { attendanceSchema } from "@/lib/validation";

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
  if (!leaveType && parsed.data.date > (await getNowForUser(userId)).dateKey) {
    return { error: "Future days can only be marked as leave or a holiday." };
  }

  // Leave days don't keep times, so switching a day to leave clears them.
  const entryMinutes =
    !leaveType && parsed.data.entryTime ? clockToMinutes(parsed.data.entryTime) : null;
  const outMinutes = !leaveType && parsed.data.outTime ? clockToMinutes(parsed.data.outTime) : null;
  const isHalfDay = !leaveType && parsed.data.isHalfDay;
  const date = dateKeyToDate(parsed.data.date);

  await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, entryMinutes, outMinutes, isHalfDay, leaveType },
    update: { entryMinutes, outMinutes, isHalfDay, leaveType },
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

export async function deleteAttendanceAction(dateKey: string): Promise<void> {
  const userId = await requireUserId();
  const date = dateKeyToDate(dateKey);

  await db.attendance
    .delete({ where: { userId_date: { userId, date } } })
    .catch(() => null);

  revalidateAttendanceViews();
}
