"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppContext } from "@/components/app/useAppContext";
import { GetAppDialog } from "@/components/app/GetAppDialog";

/** Opens the "Get the mobile app" dialog. Renders nothing inside the installed app. */
export function GetAppButton({
  variant,
  className,
}: {
  variant: "link" | "card" | "menu";
  className?: string;
}) {
  const { ready, inApp, platform } = useAppContext();
  const [open, setOpen] = useState(false);
  if (!ready || inApp) return null;

  const trigger =
    variant === "card" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-soft",
          className
        )}
      >
        <span className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-glow">
          <Smartphone className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Get the mobile app</span>
          <span className="block text-xs text-muted-foreground">Android &amp; iPhone</span>
        </span>
      </button>
    ) : variant === "menu" ? (
      <button
        type="button"
        role="menuitem"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
          className
        )}
      >
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        Get the mobile app
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400",
          className
        )}
      >
        <Smartphone className="h-4 w-4" />
        Get the mobile app
      </button>
    );

  return (
    <>
      {trigger}
      <GetAppDialog open={open} onClose={() => setOpen(false)} platform={platform} />
    </>
  );
}
