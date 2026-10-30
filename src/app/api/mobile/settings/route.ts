import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateSchedule } from "@/lib/data";
import { isValidTimeZone } from "@/lib/time";
import {
  lateEntrySchema,
  preferencesSchema,
  profileSchema,
  scheduleSchema,
} from "@/lib/validation";
import {
  json,
  readBody,
  serializeSchedule,
  serializeUser,
  withMobileUser,
} from "@/lib/mobile-api";

const remindersSchema = z.object({
  remindClockIn: z.boolean(),
  remindLeave: z.boolean(),
  remindClockOut: z.boolean(),
});

function firstIssues(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export const GET = withMobileUser(async (_req, user) => {
  const schedule = await getOrCreateSchedule(user.id);
  return json({ user: serializeUser(user), schedule: serializeSchedule(schedule) });
});

/**
 * Updates any of: profile, preferences, schedule, lateAfterMinutes, reminders, timezone. Every
 * section sent is validated before anything is saved, so a bad field never half-applies.
 */
export const PATCH = withMobileUser(async (req, user) => {
  const body = await readBody(req);
  const userData: Record<string, unknown> = {};
  const scheduleData: Record<string, unknown> = {};

  if (body.profile !== undefined) {
    const parsed = profileSchema.safeParse(body.profile);
    if (!parsed.success) return json({ fieldErrors: firstIssues(parsed.error) }, 422);
    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== user.id) {
      return json({ fieldErrors: { email: "An account with this email already exists" } }, 422);
    }
    Object.assign(userData, parsed.data);
  }

  if (body.preferences !== undefined) {
    const parsed = preferencesSchema.safeParse({
      theme: user.theme,
      timeFormat: user.timeFormat,
      ...(body.preferences as object),
    });
    if (!parsed.success) return json({ error: "Invalid preferences" }, 422);
    Object.assign(userData, parsed.data);
  }

  if (body.reminders !== undefined) {
    const parsed = remindersSchema.safeParse(body.reminders);
    if (!parsed.success) return json({ error: "Invalid reminder settings" }, 422);
    Object.assign(userData, parsed.data);
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone)) {
      return json({ error: "Invalid time zone" }, 422);
    }
    userData.timezone = body.timezone;
  }

  if (body.schedule !== undefined) {
    const parsed = scheduleSchema.safeParse(body.schedule);
    if (!parsed.success) return json({ fieldErrors: firstIssues(parsed.error) }, 422);
    Object.assign(scheduleData, parsed.data, { workingDays: parsed.data.workingDays.join(",") });
    // Choosing a schedule in the app counts as setting up, so recording time is allowed.
    if (user.needsSetup) userData.needsSetup = false;
  }

  if ("lateAfterMinutes" in body) {
    const parsed = lateEntrySchema.safeParse({ lateAfterMinutes: body.lateAfterMinutes });
    if (!parsed.success) return json({ fieldErrors: { lateAfter: "Enter a valid time" } }, 422);
    scheduleData.lateAfterMinutes = parsed.data.lateAfterMinutes;
  }

  const updatedUser = Object.keys(userData).length
    ? await db.user.update({ where: { id: user.id }, data: userData })
    : user;
  const schedule = Object.keys(scheduleData).length
    ? await db.workSchedule.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...scheduleData },
        update: scheduleData,
      })
    : await getOrCreateSchedule(user.id);

  return json({ user: serializeUser(updatedUser), schedule: serializeSchedule(schedule) });
});
