"use client";

import { useEffect } from "react";
import { claimLeaveReminderAction } from "@/lib/actions/reminders";

/**
 * While the app is open, shows the "time to leave" notification right on time instead of waiting
 * for the next scheduler run. The server-side claim keeps the two from both notifying.
 */
export function LeaveReminderTimer({
  leaveAtIso,
  tag,
  title,
  body,
}: {
  leaveAtIso: string;
  tag: string;
  title: string;
  body: string;
}) {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const delay = Date.parse(leaveAtIso) - Date.now();
    if (!(delay > 0) || delay > 24 * 60 * 60 * 1000) return;

    const timer = window.setTimeout(async () => {
      if (!(await claimLeaveReminderAction())) return;
      const options = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) await registration.showNotification(title, options);
      else new Notification(title, options);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [leaveAtIso, tag, title, body]);

  return null;
}
