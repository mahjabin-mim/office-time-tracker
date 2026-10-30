"use client";

import {
  type InputHTMLAttributes,
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
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

export type DeviceState = "checking" | "unsupported" | "denied" | "off" | "on";

export const REMINDER_PREFS = [
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
    description:
      "Two hours after your leave time if the day is still open, or when extra hours have been running for 3 hours.",
  },
] as const;

export type ReminderPrefs = Record<(typeof REMINDER_PREFS)[number]["name"], boolean>;

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

/** The "This device" row: whether notifications reach this browser, and turning them on or off. */
export function DeviceNotifications({
  vapidPublicKey,
  onChange,
}: {
  vapidPublicKey: string | null;
  onChange: (device: DeviceState) => void;
}) {
  const [device, setDevice] = useState<DeviceState>("checking");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => onChange(device), [device, onChange]);

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
    <>
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
    </>
  );
}

/** Says why the reminder options are locked while notifications are off on this device. */
export function RemindersLockedNote({ device }: { device: DeviceState }) {
  if (device === "on" || device === "checking") return null;
  return (
    <p className="text-xs text-muted-foreground">
      Turn on notifications for this device to choose your reminders.
    </p>
  );
}

/** One reminder's checkbox. Put it in a `group` fieldset, which locks it while disabled. */
export function ReminderOption({
  pref,
  ...input
}: { pref: (typeof REMINDER_PREFS)[number] } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input px-3.5 py-3 transition-colors hover:bg-muted/50 has-[:checked]:border-brand-600/40 has-[:checked]:bg-brand-600/[0.06] group-disabled:cursor-not-allowed group-disabled:hover:bg-transparent">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
        {...input}
      />
      <span>
        <span className="block text-sm font-medium">{pref.title}</span>
        <span className="block text-xs text-muted-foreground">{pref.description}</span>
      </span>
    </label>
  );
}

export function ReminderSettings({
  vapidPublicKey,
  prefs,
}: {
  vapidPublicKey: string | null;
  prefs: ReminderPrefs;
}) {
  const [device, setDevice] = useState<DeviceState>("checking");
  const [prefsState, prefsAction] = useActionState(updateReminderPrefsAction, null);

  return (
    <div className="space-y-5">
      <DeviceNotifications vapidPublicKey={vapidPublicKey} onChange={setDevice} />

      <form action={prefsAction} className="space-y-3">
        {prefsState?.success && <Alert variant="success">Reminder preferences saved.</Alert>}
        <RemindersLockedNote device={device} />
        {/* Reminders only arrive once notifications are on, so they can't be chosen before that. */}
        <fieldset disabled={device !== "on"} className="group min-w-0 space-y-3 disabled:opacity-50">
          {REMINDER_PREFS.map((pref) => (
            <ReminderOption
              key={pref.name}
              pref={pref}
              name={pref.name}
              defaultChecked={prefs[pref.name]}
            />
          ))}
          <SubmitButton size="sm" pendingLabel="Saving…">
            Save reminders
          </SubmitButton>
        </fieldset>
      </form>
    </div>
  );
}
