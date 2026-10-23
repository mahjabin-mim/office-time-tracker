import { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export function SettingsSection({
  icon,
  title,
  description,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  tone?: "danger";
  children: ReactNode;
}) {
  return (
    <Card className={cn("h-full", tone === "danger" && "border-less/30")}>
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            tone === "danger"
              ? "bg-less/10 text-less"
              : "bg-brand-600/10 text-brand-600 dark:text-brand-400"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
