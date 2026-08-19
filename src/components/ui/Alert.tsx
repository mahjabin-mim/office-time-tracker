import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Alert({
  children,
  variant = "error",
}: {
  children: React.ReactNode;
  variant?: "error" | "success";
}) {
  const Icon = variant === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm",
        variant === "error"
          ? "border-less/30 bg-less/10 text-less"
          : "border-extra/30 bg-extra/10 text-extra"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
