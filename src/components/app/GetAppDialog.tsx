"use client";

import { Download, Share, Smartphone, SquarePlus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { ANDROID_APP_URL, type Platform } from "@/lib/platform";

function AndroidSection({ highlight }: { highlight: boolean }) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "border-brand-600/40 bg-brand-600/[0.06]" : "border-border"
      )}
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <Smartphone className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Android
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Install the app (about 2 MB). Needs Android 7 or newer.
      </p>
      <a
        href={ANDROID_APP_URL}
        className="bg-brand-gradient mt-3 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white shadow-glow transition-all hover:-translate-y-px hover:shadow-lift"
      >
        <Download className="h-4 w-4" />
        Download for Android
      </a>
      <p className="mt-2 text-xs text-muted-foreground">
        If Android asks, allow installing apps from your browser, then open the downloaded file.
      </p>
    </section>
  );
}

function IosSection({ highlight }: { highlight: boolean }) {
  const steps = [
    <>
      Open <span className="font-medium text-foreground">officetimetracker.vercel.app</span> in
      Safari.
    </>,
    <>
      Tap the <Share className="mx-0.5 inline h-4 w-4 -translate-y-px" />{" "}
      <span className="font-medium text-foreground">Share</span> button.
    </>,
    <>
      Choose <SquarePlus className="mx-0.5 inline h-4 w-4 -translate-y-px" />{" "}
      <span className="font-medium text-foreground">Add to Home Screen</span>, then tap Add.
    </>,
    <>
      Open <span className="font-medium text-foreground">Time Tracker</span> from your Home Screen.
    </>,
  ];
  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "border-brand-600/40 bg-brand-600/[0.06]" : "border-border"
      )}
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <Smartphone className="h-4 w-4 text-brand-600 dark:text-brand-400" /> iPhone &amp; iPad
      </h3>
      <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        It opens full screen like any app. Reminders work on iOS 16.4 or newer once it&apos;s on
        your Home Screen.
      </p>
    </section>
  );
}

export function GetAppDialog({
  open,
  onClose,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  platform: Platform;
}) {
  const sections =
    platform === "ios"
      ? [<IosSection key="ios" highlight />, <AndroidSection key="android" highlight={false} />]
      : [
          <AndroidSection key="android" highlight={platform === "android"} />,
          <IosSection key="ios" highlight={false} />,
        ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Get the mobile app"
      description="Track your time right from your phone's home screen."
    >
      <div className="space-y-3">{sections}</div>
    </Dialog>
  );
}
