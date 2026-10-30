"use client";

import { useState } from "react";
import { Download, Share } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppContext } from "@/components/app/useAppContext";
import { GetAppDialog } from "@/components/app/GetAppDialog";
import { ANDROID_APP_URL } from "@/lib/platform";

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-200 active:scale-[0.98]";
const primary = "bg-brand-gradient text-white shadow-glow hover:-translate-y-px hover:shadow-lift";
const secondary = "border border-border bg-surface text-foreground hover:bg-muted";

/**
 * Under the login and sign-up forms: the Android download and the iPhone Home Screen steps, one
 * tap each, with the visitor's own phone first. Renders nothing inside the installed app.
 */
export function GetAppLinks() {
  const { ready, inApp, platform } = useAppContext();
  const [open, setOpen] = useState(false);
  if (!ready || inApp) return null;

  const android = (
    <a
      key="android"
      href={ANDROID_APP_URL}
      className={cn(buttonBase, platform === "android" ? primary : secondary)}
    >
      <Download className="h-4 w-4" />
      Android app
    </a>
  );
  const iphone = (
    <button
      key="ios"
      type="button"
      onClick={() => setOpen(true)}
      className={cn(buttonBase, platform === "ios" ? primary : secondary)}
    >
      <Share className="h-4 w-4" />
      iPhone &amp; iPad
    </button>
  );

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <p className="text-sm font-semibold">Get the mobile app</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Download the app on Android. On iPhone, add it to your Home Screen from Safari.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {platform === "ios" ? [iphone, android] : [android, iphone]}
      </div>
      <GetAppDialog open={open} onClose={() => setOpen(false)} platform="ios" />
    </div>
  );
}
