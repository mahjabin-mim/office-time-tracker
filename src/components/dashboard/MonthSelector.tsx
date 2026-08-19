import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel } from "@/lib/time";

export function MonthSelector({ year, month }: { year: number; month: number }) {
  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const now = new Date();
  const isCurrentOrFutureNext =
    next.year > now.getFullYear() || (next.year === now.getFullYear() && next.month > now.getMonth());

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-soft">
      <Link
        href={`/dashboard/monthly?year=${prev.year}&month=${prev.month}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[10rem] px-2 text-center text-sm font-semibold">
        {formatMonthLabel(year, month)}
      </span>
      {isCurrentOrFutureNext ? (
        <span
          aria-disabled
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/40"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link
          href={`/dashboard/monthly?year=${next.year}&month=${next.month}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
