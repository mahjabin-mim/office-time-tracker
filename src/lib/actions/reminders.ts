"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { getZonedNow } from "@/lib/time";
import { claimReminder, isPushConfigured, sendPushToUser } from "@/lib/push";
import { pushSubscriptionSchema } from "@/lib/validation";

export async function savePushSubscriptionAction(subscription: unknown): Promise<boolean> {
  const userId = await requireUserId();
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success) return false;

  const { endpoint, keys } = parsed.data;
  // A browser has one endpoint; if someone else used this device before, it moves to this user.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
  });

  revalidatePath("/dashboard/settings");
  return true;
}

export async function removePushSubscriptionAction(endpoint: string): Promise<void> {
  const userId = await requireUserId();
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
  revalidatePath("/dashboard/settings");
}

export async function sendTestNotificationAction(): Promise<{ delivered: number; error?: string }> {
  const userId = await requireUserId();
  if (!isPushConfigured()) {
    return { delivered: 0, error: "Push notifications aren't configured on the server." };
  }
  const delivered = await sendPushToUser(userId, {
    title: "Notifications are working ✅",
    body: "You'll get reminders here for clocking in, leaving, and clocking out.",
    tag: "test",
    url: "/dashboard",
  });
  return delivered > 0
    ? { delivered }
    : { delivered, error: "No device accepted the notification. Try turning notifications off and on again." };
}

/**
 * Called by the in-app timer when today's leave time arrives while the app is open. Returns
 * whether the page should show the notification (false if the scheduler already sent it).
 */
export async function claimLeaveReminderAction(): Promise<boolean> {
  const userId = await requireUserId();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { timezone: true, remindLeave: true },
  });
  if (!user?.remindLeave) return false;
  return claimReminder(userId, getZonedNow(user.timezone).dateKey, "leave");
}
