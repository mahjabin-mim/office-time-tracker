import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

export function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "extra" | "less" | "brand";
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        className
      )}
    >
      {/* Accent line that sweeps in on hover */}
      <span className="bg-brand-gradient absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
          tone === "extra" && "text-extra",
          tone === "less" && "text-less",
          tone === "brand" && "text-brand-600 dark:text-brand-400"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </Card>
  );
}
