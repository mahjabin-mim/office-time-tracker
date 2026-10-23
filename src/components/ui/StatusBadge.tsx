import { cn } from "@/lib/cn";
import { LEAVE_LABELS, STATUS_LABELS, type DayStatus, type LeaveType } from "@/lib/time";
import {
  ArrowUpRight,
  ArrowDownRight,
  CircleDashed,
  Clock,
  Minus,
  CalendarX2,
  CircleHelp,
  Palmtree,
  CircleSlash,
} from "lucide-react";

const config: Record<
  DayStatus,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  extra: {
    className: "bg-extra/15 text-extra",
    icon: ArrowUpRight,
  },
  less: {
    className: "bg-less/15 text-less",
    icon: ArrowDownRight,
  },
  "on-target": {
    className: "bg-muted text-muted-foreground",
    icon: Minus,
  },
  "in-progress": {
    className: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
    icon: Clock,
  },
  missing: {
    className: "bg-less/10 text-less",
    icon: CircleHelp,
  },
  incomplete: {
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    icon: CircleDashed,
  },
  "non-working": {
    className: "bg-muted text-muted-foreground",
    icon: CalendarX2,
  },
  future: {
    className: "bg-muted/60 text-muted-foreground",
    icon: CircleDashed,
  },
  leave: {
    className: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    icon: Palmtree,
  },
  "not-tracked": {
    className: "bg-muted/60 text-muted-foreground",
    icon: CircleSlash,
  },
};

export function StatusBadge({
  status,
  leaveType,
  className,
}: {
  status: DayStatus;
  /** Shown instead of the generic "Leave" label, e.g. "Sick leave" or "Holiday". */
  leaveType?: LeaveType | null;
  className?: string;
}) {
  const { className: colorClass, icon: Icon } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {status === "leave" && leaveType ? LEAVE_LABELS[leaveType] : STATUS_LABELS[status]}
    </span>
  );
}

export function HalfDayTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300",
        className
      )}
      title="Half day: shorter expected time"
    >
      Half day
    </span>
  );
}

/** Marks time worked on a non-working day, which all counts as extra. */
export function DayOffWorkTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300",
        className
      )}
      title="Worked on a day off: all of it counts as extra time"
    >
      Day off
    </span>
  );
}
