import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const arrowClass =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** "‹ October 2026 ›" style switcher; pass `nextHref={null}` to stop at the current period. */
export function PeriodSelector({
  label,
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
}: {
  label: string;
  prevHref: string;
  nextHref: string | null;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-soft">
      <Link href={prevHref} className={arrowClass} aria-label={prevLabel}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[9rem] px-2 text-center text-sm font-semibold">{label}</span>
      {nextHref ? (
        <Link href={nextHref} className={arrowClass} aria-label={nextLabel}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-disabled
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/40"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
