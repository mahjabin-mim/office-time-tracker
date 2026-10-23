"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOAST_EVENT, type ToastMessage } from "@/lib/toast";

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const DURATION_MS = 3200;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const message = (e as CustomEvent<ToastMessage>).detail;
      setToasts((list) => [...list.slice(-2), message]);
      window.setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== message.id));
      }, DURATION_MS);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-4 py-3 text-sm font-medium shadow-lift backdrop-blur"
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  t.tone === "success" && "text-extra",
                  t.tone === "error" && "text-less",
                  t.tone === "info" && "text-brand-600 dark:text-brand-400"
                )}
              />
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
