"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { createSession, destroySession, getSession } from "@/lib/session";
import { clockToMinutes, isValidTimeZone } from "@/lib/time";
import {
  deleteAccountSchema,
  passwordChangeSchema,
  preferencesSchema,
  profileSchema,
  scheduleSchema,
  lateEntrySchema,
} from "@/lib/validation";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

export async function updateScheduleAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const workStartRaw = String(formData.get("workStart") ?? "09:00");
  const workEndRaw = String(formData.get("workEnd") ?? "17:00");
  const workingDays = formData.getAll("workingDays").map((v) => Number(v));

  const parsed = scheduleSchema.safeParse({
    expectedDailyMinutes: Number(formData.get("expectedDailyHours")) * 60,
    halfDayMinutes: Math.round(Number(formData.get("halfDayHours")) * 60),
    workStartMinutes: clockToMinutes(workStartRaw) ?? 540,
    workEndMinutes: clockToMinutes(workEndRaw) ?? 1020,
    workingDays,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.workSchedule.upsert({
    where: { userId },
    create: { userId, ...parsed.data, workingDays: parsed.data.workingDays.join(",") },
    update: { ...parsed.data, workingDays: parsed.data.workingDays.join(",") },
  });
  // Choosing a schedule here counts as setting up, so the setup screen stops being offered.
  await db.user.updateMany({ where: { id: userId, needsSetup: true }, data: { needsSetup: false } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
  revalidatePath("/dashboard/yearly");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateLateEntryAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const raw = String(formData.get("lateAfter") ?? "");
  const lateAfterMinutes = raw ? clockToMinutes(raw) : null;
  if (raw && lateAfterMinutes == null) {
    return { fieldErrors: { lateAfter: "Enter a valid time" } };
  }

  const parsed = lateEntrySchema.safeParse({ lateAfterMinutes });
  if (!parsed.success) return { fieldErrors: { lateAfter: "Enter a valid time" } };

  await db.workSchedule.upsert({
    where: { userId },
    create: { userId, lateAfterMinutes: parsed.data.lateAfterMinutes },
    update: { lateAfterMinutes: parsed.data.lateAfterMinutes },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
  revalidatePath("/dashboard/yearly");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

/** Saves the time zone reported by the browser; returns whether anything changed. */
export async function updateTimezoneAction(timezone: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!timezone || !isValidTimeZone(timezone)) return false;

  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user || user.timezone === timezone) return false;

  await db.user.update({ where: { id: userId }, data: { timezone } });
  return true;
}

export async function updateReminderPrefsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  await db.user.update({
    where: { id: userId },
    data: {
      remindClockIn: formData.get("remindClockIn") === "on",
      remindLeave: formData.get("remindLeave") === "on",
      remindClockOut: formData.get("remindClockOut") === "on",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateProfileAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const parsed = profileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== userId) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  await db.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, email: parsed.data.email },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function changePasswordAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  // Google-only accounts have no password yet, so there's nothing to verify.
  if (user.passwordHash) {
    if (!parsed.data.currentPassword) {
      return { fieldErrors: { currentPassword: "Current password is required" } };
    }
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return { fieldErrors: { currentPassword: "Current password is incorrect" } };
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  // Bumping the version signs out every other device; this one gets a fresh cookie.
  const updated = await db.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  const session = await getSession();
  await createSession(updated, session?.remember ?? false);

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/** Signs the user out everywhere, including this device. */
export async function logoutAllDevicesAction(): Promise<void> {
  const userId = await requireUserId();
  await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await destroySession();
  redirect("/login?signedout=all");
}

export async function disconnectGoogleAction(): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (!user.passwordHash) {
    return { error: "Set a password first so you can still log in after disconnecting Google." };
  }

  await db.user.update({ where: { id: userId }, data: { googleId: null } });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteAccountAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const parsed = deleteAccountSchema.safeParse({
    confirmation: String(formData.get("confirmation") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  if (user.passwordHash) {
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return { fieldErrors: { password: "Password is incorrect" } };
  }

  // Attendance records and the work schedule cascade-delete with the user.
  await db.user.delete({ where: { id: userId } });
  await destroySession();
  redirect("/login?deleted=1");
}

export async function updatePreferencesAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const userId = await requireUserId();

  const parsed = preferencesSchema.safeParse({
    theme: String(formData.get("theme") ?? "system"),
    timeFormat: String(formData.get("timeFormat") ?? "12h"),
  });

  if (!parsed.success) {
    return { error: "Invalid preferences" };
  }

  await db.user.update({
    where: { id: userId },
    data: { theme: parsed.data.theme, timeFormat: parsed.data.timeFormat },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
  revalidatePath("/dashboard/settings");
  return { success: true };
}
