"use client";

import { useActionState, useEffect } from "react";
import { LogIn, LogOut } from "lucide-react";
import { clockAction } from "@/lib/actions/attendance";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

export function ClockButton({
  mode,
  label,
  variant = "primary",
  size = "md",
}: {
  mode: "in" | "out";
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [state, formAction] = useActionState(clockAction, null);
  const Icon = mode === "in" ? LogIn : LogOut;

  useEffect(() => {
    if (!state?.success) return;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    toast(mode === "in" ? `Clocked in at ${time}. Have a great day!` : `Clocked out at ${time}`);
  }, [state, mode]);

  return (
    <form action={formAction} className="flex flex-col items-center gap-1.5">
      <SubmitButton
        variant={variant}
        size={size}
        pendingLabel={mode === "in" ? "Clocking in…" : "Clocking out…"}
        // A gentle pulse invites the main "Clock in" tap.
        className={cn(mode === "in" && variant === "primary" && "animate-ring-pulse")}
      >
        <Icon className="h-4 w-4" />
        {label ?? (mode === "in" ? "Clock in" : "Clock out")}
      </SubmitButton>
      {state?.error && <p className="text-xs text-less">{state.error}</p>}
    </form>
  );
}
