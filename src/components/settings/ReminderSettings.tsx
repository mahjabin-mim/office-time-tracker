"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "@/lib/actions/reminders";
import { updateReminderPrefsAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

type DeviceState = "checking" | "unsupported" | "denied" | "off" | "on";

const PREFS = [
  {
    name: "remindClockIn",
    title: "Forgot to clock in",
    description: "An hour after your work start time, if you haven't clocked in.",
  },
  {
    name: "remindLeave",
    title: "Time to leave",
    description: "When you've completed today's expected hours.",
  },
  {
    name: "remindClockOut",
    title: "Forgot to clock out",
    description: "Two hours after your leave time, if the day is still open.",
  },
] as const;

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function getRegistration() {
  return (
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register("/sw.js"))
  );
}

export function ReminderSettings({
  vapidPublicKey,
  prefs,
}: {
  vapidPublicKey: string | null;
  prefs: Record<(typeof PREFS)[number]["name"], boolean>;
}) {
  const [device, setDevice] = useState<DeviceState>("checking");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [prefsState, prefsAction] = useActionState(updateReminderPrefsAction, null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setDevice("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setDevice("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setDevice(sub ? "on" : "off"))
      .catch(() => setDevice("off"));
  }, []);

  function enable() {
    startTransition(async () => {
      setMessage(null);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setDevice(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await getRegistration();
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
          }));
        const saved = await savePushSubscriptionAction(subscription.toJSON());
        setDevice(saved ? "on" : "off");
        if (!saved) setMessage({ tone: "error", text: "Couldn't save this device. Please try again." });
      } catch {
        setMessage({ tone: "error", text: "This browser couldn't turn on notifications." });
      }
    });
  }

  function disable() {
    startTransition(async () => {
      setMessage(null);
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setDevice("off");
    });
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestNotificationAction();
      setMessage(
        result.error
          ? { tone: "error", text: result.error }
          : { tone: "success", text: "Test sent. It should appear in a few seconds." }
      );
    });
  }

  return (
    <div className="space-y-5">
      {message && <Alert variant={message.tone}>{message.text}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-400">
            {device === "on" ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-medium">This device</p>
            <p className="text-xs text-muted-foreground">
              {!vapidPublicKey
                ? "Notifications aren't set up on the server yet."
                : device === "checking"
                ? "Checking…"
                : device === "unsupported"
                ? "Not supported here. On iPhone, add the app to your Home Screen first."
                : device === "denied"
                ? "Blocked. Allow notifications for this site in your browser settings."
                : device === "on"
                ? "Notifications are on."
                : "Notifications are off."}
            </p>
          </div>
        </div>
        {vapidPublicKey && (device === "off" || device === "on") && (
          <div className="flex items-center gap-2">
            {device === "on" && (
              <Button variant="ghost" size="sm" onClick={sendTest} disabled={busy}>
                <Send className="h-3.5 w-3.5" />
                Send test
              </Button>
            )}
            <Button
              variant={device === "on" ? "outline" : "primary"}
              size="sm"
              onClick={device === "on" ? disable : enable}
              disabled={busy}
            >
              {device === "on" ? "Turn off" : "Turn on"}
            </Button>
          </div>
        )}
      </div>

      <form action={prefsAction} className="space-y-3">
        {prefsState?.success && <Alert variant="success">Reminder preferences saved.</Alert>}
        {PREFS.map((pref) => (
          <label
            key={pref.name}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-input px-3.5 py-3 transition-colors hover:bg-muted/50 has-[:checked]:border-brand-600/40 has-[:checked]:bg-brand-600/[0.06]"
          >
            <input
              type="checkbox"
              name={pref.name}
              defaultChecked={prefs[pref.name]}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium">{pref.title}</span>
              <span className="block text-xs text-muted-foreground">{pref.description}</span>
            </span>
          </label>
        ))}
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save reminders
        </SubmitButton>
      </form>
    </div>
  );
}
