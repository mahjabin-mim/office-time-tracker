import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import type { ReminderKind } from "@/lib/reminders";

export type PushPayload = {
  title: string;
  body: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
  url?: string;
};

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    // Push services (notably Apple's) reject subjects pointing at localhost.
    process.env.VAPID_SUBJECT || "https://officetimetracker.vercel.app",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidReady = true;
}

/** Sends to every device the user enabled; returns how many accepted it. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  ensureVapid();
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 }
        );
        return true;
      } catch (err) {
        // 404/410 mean the browser dropped this subscription; stop sending to it.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        }
        return false;
      }
    })
  );
  return results.filter(Boolean).length;
}

/**
 * Records that a reminder went out. Returns false if it was already sent today, which is how the
 * scheduler and the in-app timer avoid notifying twice.
 */
export async function claimReminder(
  userId: string,
  dateKey: string,
  kind: ReminderKind
): Promise<boolean> {
  try {
    await db.reminderLog.create({ data: { userId, dateKey, kind } });
    return true;
  } catch {
    return false;
  }
}
