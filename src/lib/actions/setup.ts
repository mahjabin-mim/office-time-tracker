"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { scheduleFromSetup } from "@/lib/setup";
import { setupSchema, type SetupChoices } from "@/lib/validation";

export type SetupState = { error?: string } | null;

/** Saves the "Set up your workday" screen in one go, which unlocks recording, then opens the dashboard. */
export async function completeSetupAction(choices: SetupChoices): Promise<SetupState> {
  const userId = await requireUserId();

  const parsed = setupSchema.safeParse(choices);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your answers" };
  const { lateAfterMinutes, timeFormat, reminders } = parsed.data;
  const schedule = { ...scheduleFromSetup(parsed.data), lateAfterMinutes };

  await db.$transaction([
    db.workSchedule.upsert({
      where: { userId },
      create: { userId, ...schedule },
      update: schedule,
    }),
    db.user.update({
      where: { id: userId },
      data: { timeFormat, ...reminders, needsSetup: false },
    }),
  ]);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
