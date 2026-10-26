"use client";

import { useActionState, useEffect } from "react";
import { LogIn, LogOut } from "lucide-react";
import { clockAction, clockExtraAction } from "@/lib/actions/attendance";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ButtonProps } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

export function ClockButton({
  mode,
  extra = false,
  label,
  variant = "primary",
  size = "md",
}: {
  mode: "in" | "out";
  /** Clocks the extra-hours session instead of the regular day. */
  extra?: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [state, formAction] = useActionState(extra ? clockExtraAction : clockAction, null);
  const Icon = mode === "in" ? LogIn : LogOut;

  useEffect(() => {
    if (!state?.success) return;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (extra) {
      toast(mode === "in" ? `Extra hours started at ${time}` : `Extra hours ended at ${time}`);
    } else {
      toast(mode === "in" ? `Clocked in at ${time}. Have a great day!` : `Clocked out at ${time}`);
    }
  }, [state, mode, extra]);

  return (
    <form action={formAction} className="flex flex-col items-center gap-1.5">
      <SubmitButton
        variant={variant}
        size={size}
        pendingLabel={mode === "in" ? (extra ? "Starting…" : "Clocking in…") : extra ? "Ending…" : "Clocking out…"}
      >
        <Icon className="h-4 w-4" />
        {label ?? (extra ? (mode === "in" ? "Start extra hours" : "End extra hours") : mode === "in" ? "Clock in" : "Clock out")}
      </SubmitButton>
      {state?.error && <p className="text-xs text-less">{state.error}</p>}
    </form>
  );
}
