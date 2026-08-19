import { cn } from "@/lib/cn";
import type { DayStatus } from "@/lib/time";
import {
  ArrowUpRight,
  ArrowDownRight,
  CircleDashed,
  Clock,
  Minus,
  CalendarX2,
  CircleHelp,
} from "lucide-react";

const config: Record<
  DayStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  extra: {
    label: "Extra",
    className: "bg-extra/15 text-extra",
    icon: ArrowUpRight,
  },
  less: {
    label: "Less",
    className: "bg-less/15 text-less",
    icon: ArrowDownRight,
  },
  "on-target": {
    label: "On target",
    className: "bg-muted text-muted-foreground",
    icon: Minus,
  },
  "in-progress": {
    label: "In progress",
    className: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
    icon: Clock,
  },
  missing: {
    label: "Missing",
    className: "bg-less/10 text-less",
    icon: CircleHelp,
  },
  incomplete: {
    label: "Incomplete",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    icon: CircleDashed,
  },
  "non-working": {
    label: "Day off",
    className: "bg-muted text-muted-foreground",
    icon: CalendarX2,
  },
  future: {
    label: "Upcoming",
    className: "bg-muted/60 text-muted-foreground",
    icon: CircleDashed,
  },
};

export function StatusBadge({ status, className }: { status: DayStatus; className?: string }) {
  const { label, className: colorClass, icon: Icon } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
