"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { clockToMinutes } from "@/lib/time";
import {
  passwordChangeSchema,
  preferencesSchema,
  profileSchema,
  scheduleSchema,
} from "@/lib/validation";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | null;

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session.userId;
}

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
    breakMinutes: Number(formData.get("breakMinutes")),
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/monthly");
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

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { fieldErrors: { currentPassword: "Current password is incorrect" } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  return { success: true };
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
