"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { useAppContext } from "@/components/app/useAppContext";
import { GetAppDialog } from "@/components/app/GetAppDialog";
import { ANDROID_APP_URL } from "@/lib/platform";

const DISMISSED_KEY = "ott-app-banner-dismissed";

/** A dismissible nudge on phones browsing the website; hidden inside the installed app. */
export function GetAppBanner() {
  const { ready, inApp, platform } = useAppContext();
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!ready || inApp || dismissed || platform === "desktop") return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-brand-600/30 bg-brand-600/[0.07] p-3 pr-2">
      <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-glow">
        <Smartphone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Get the app</p>
        <p className="text-xs text-muted-foreground">
          {platform === "android" ? "One tap to your home screen." : "Add it to your Home Screen."}
        </p>
      </div>
      {platform === "android" ? (
        <a
          href={ANDROID_APP_URL}
          className="bg-brand-gradient inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white shadow-glow"
        >
          <Download className="h-4 w-4" />
          Install
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-brand-gradient inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-white shadow-glow"
        >
          How to
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <GetAppDialog open={open} onClose={() => setOpen(false)} platform={platform} />
    </div>
  );
}
