"use client";

import { useActionState } from "react";
import { updatePreferencesAction } from "@/lib/actions/settings";
import { Label } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/cn";

export function PreferencesForm({
  theme,
  timeFormat,
}: {
  theme: string;
  timeFormat: string;
}) {
  const [state, formAction] = useActionState(updatePreferencesAction, null);

  return (
    <form
      action={(formData) => {
        const selectedTheme = formData.get("theme");
        if (typeof selectedTheme === "string") {
          try {
            localStorage.setItem("ott-theme", selectedTheme);
            const isDark =
              selectedTheme === "dark" ||
              (selectedTheme === "system" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);
            document.documentElement.classList.toggle("dark", isDark);
          } catch {
            // ignore
          }
        }
        return formAction(formData);
      }}
      className="space-y-5"
    >
      {state?.success && <Alert variant="success">Preferences updated.</Alert>}

      <div>
        <Label>Theme</Label>
        <RadioGroup name="theme" defaultValue={theme} options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]} />
      </div>

      <div>
        <Label>Time format</Label>
        <RadioGroup name="timeFormat" defaultValue={timeFormat} options={[
          { value: "12h", label: "12-hour" },
          { value: "24h", label: "24-hour" },
        ]} />
      </div>

      <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
    </form>
  );
}

function RadioGroup({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "cursor-pointer rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors",
            "has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={defaultValue === opt.value}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
