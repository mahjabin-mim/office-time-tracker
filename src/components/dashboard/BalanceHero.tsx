import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { cn } from "@/lib/cn";
import type { PeriodSummary } from "@/lib/calendar";

export function BalanceHero({
  summary,
  period,
  className,
}: {
  summary: PeriodSummary;
  period: "month" | "year";
  className?: string;
}) {
  const positive = summary.balanceMinutes >= 0;
  const total = summary.totalExtraMinutes + summary.totalLessMinutes;
  const extraShare = total > 0 ? (summary.totalExtraMinutes / total) * 100 : 50;

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden p-6",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl",
          positive ? "bg-extra/25" : "bg-less/25"
        )}
      />
      <div className="relative">
        <p className="text-sm font-medium text-muted-foreground">Net balance</p>
        <p
          className={cn(
            "mt-2 text-5xl font-semibold tracking-tight tabular-nums",
            positive ? "text-extra" : "text-less"
          )}
        >
          <AnimatedNumber value={summary.balanceMinutes} format="signed" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {positive ? `Extra time this ${period}` : `Less time this ${period}`}
        </p>
      </div>

      <div className="relative mt-8 space-y-3">
        <div className="flex h-2.5 origin-left animate-grow-x overflow-hidden rounded-full bg-muted">
          {total > 0 && (
            <>
              <div className="h-full bg-extra" style={{ width: `${extraShare}%` }} />
              <div className="h-full bg-less" style={{ width: `${100 - extraShare}%` }} />
            </>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-extra">
            <ArrowUpRight className="h-4 w-4" />
            <AnimatedNumber value={summary.totalExtraMinutes} format="duration" /> extra
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-less">
            <ArrowDownRight className="h-4 w-4" />
            <AnimatedNumber value={summary.totalLessMinutes} format="duration" /> less
          </span>
        </div>
      </div>
    </Card>
  );
}
