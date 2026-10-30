"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import {
  clearExtraHours,
  clockAttendance,
  clockExtraHours,
  deleteAttendance,
  saveAttendance,
  saveExtraHours,
  type AttendanceResult,
} from "@/lib/attendance-service";

export type AttendanceFormState = AttendanceResult;

function revalidateAttendanceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
  revalidatePath("/dashboard/yearly");
}

/** Revalidates the views after a write that went through. */
function refreshOnSuccess(result: AttendanceResult): AttendanceResult {
  if (result?.success) revalidateAttendanceViews();
  return result;
}

export async function saveAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  const userId = await requireUserId();
  return refreshOnSuccess(
    await saveAttendance(userId, {
      date: String(formData.get("date") ?? ""),
      dayType: String(formData.get("dayType") ?? "work"),
      entryTime: String(formData.get("entryTime") ?? ""),
      outTime: String(formData.get("outTime") ?? ""),
      isHalfDay: formData.get("isHalfDay") === "on",
    })
  );
}

/** One-tap clock: records the current time as today's entry, or as its out time once clocked in. */
export async function clockAction(_prevState: AttendanceFormState): Promise<AttendanceFormState> {
  const userId = await requireUserId();
  return refreshOnSuccess(await clockAttendance(userId));
}

/** Saves a day's extra-hours session from its own dialog. */
export async function saveExtraHoursAction(
  _prevState: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  const userId = await requireUserId();
  return refreshOnSuccess(
    await saveExtraHours(userId, {
      date: String(formData.get("date") ?? ""),
      extraEntryTime: String(formData.get("extraEntryTime") ?? ""),
      extraOutTime: String(formData.get("extraOutTime") ?? ""),
    })
  );
}

/** Removes a day's extra-hours session and leaves the rest of the day alone. */
export async function clearExtraHoursAction(dateKey: string): Promise<void> {
  const userId = await requireUserId();
  await clearExtraHours(userId, dateKey);
  revalidateAttendanceViews();
}

/** One-tap clock for extra hours: starts today's extra session, or ends it once it is running. */
export async function clockExtraAction(
  _prevState: AttendanceFormState
): Promise<AttendanceFormState> {
  const userId = await requireUserId();
  return refreshOnSuccess(await clockExtraHours(userId));
}

export async function deleteAttendanceAction(dateKey: string): Promise<void> {
  const userId = await requireUserId();
  await deleteAttendance(userId, dateKey);
  revalidateAttendanceViews();
}
