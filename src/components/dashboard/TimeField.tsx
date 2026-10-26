"use client";

import { useRef } from "react";
import { Input, FieldError } from "@/components/ui/Input";
import { minutesToClock } from "@/lib/time";

export function TimeField({
  name,
  label,
  defaultValue,
  showNow,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  showNow: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function fillNow() {
    const now = new Date();
    if (inputRef.current) {
      inputRef.current.value = minutesToClock(now.getHours() * 60 + now.getMinutes(), "24h");
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {showNow && (
          <button
            type="button"
            onClick={fillNow}
            className="rounded-md px-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-600/10 dark:text-brand-400"
          >
            Now
          </button>
        )}
      </div>
      <Input ref={inputRef} id={name} name={name} type="time" defaultValue={defaultValue ?? ""} />
      <FieldError>{error}</FieldError>
    </div>
  );
}
