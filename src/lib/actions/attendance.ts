"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { clockToMinutes, dateKeyToDate } from "@/lib/time";
import { attendanceSchema } from "@/lib/validation";

export type AttendanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session.userId;
}

export async function saveAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  const userId = await requireUserId();

  const raw = {
    date: String(formData.get("date") ?? ""),
    entryTime: String(formData.get("entryTime") ?? ""),
    outTime: String(formData.get("outTime") ?? ""),
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

  const entryMinutes = parsed.data.entryTime ? clockToMinutes(parsed.data.entryTime) : null;
  const outMinutes = parsed.data.outTime ? clockToMinutes(parsed.data.outTime) : null;
  const date = dateKeyToDate(parsed.data.date);

  await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, entryMinutes, outMinutes },
    update: { entryMinutes, outMinutes },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
  return { success: true };
}

export async function deleteAttendanceAction(dateKey: string): Promise<void> {
  const userId = await requireUserId();
  const date = dateKeyToDate(dateKey);

  await db.attendance
    .delete({ where: { userId_date: { userId, date } } })
    .catch(() => null);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
}
