"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Settings, Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/lib/actions/auth";
import { useAppContext } from "@/components/app/useAppContext";
import { GetAppDialog } from "@/components/app/GetAppDialog";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  // Owned here, outside the menu, so closing the menu doesn't also close the dialog.
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const app = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:bg-muted"
      >
        <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">{name}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-card p-1.5 shadow-soft"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
            {app.ready && !app.inApp && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setAppDialogOpen(true);
                }}
                className={itemClass}
              >
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Get the mobile app
              </button>
            )}
            <form action={logoutAction}>
              <button type="submit" role="menuitem" className={cn(itemClass, "text-less")}>
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <GetAppDialog
        open={appDialogOpen}
        onClose={() => setAppDialogOpen(false)}
        platform={app.platform}
      />
    </div>
  );
}
