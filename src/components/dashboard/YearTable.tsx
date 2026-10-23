import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { MonthBreakdown } from "@/lib/calendar";
import {
  formatMonthLabel,
  formatMonthShort,
  minutesToDuration,
  minutesToDurationSigned,
} from "@/lib/time";

function balanceClass(minutes: number) {
  return minutes > 0 ? "text-extra" : minutes < 0 ? "text-less" : "text-muted-foreground";
}

export function YearTable({ year, months }: { year: number; months: MonthBreakdown[] }) {
  const href = (month: number) => `/dashboard/monthly?year=${year}&month=${month}`;

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border md:hidden">
        {months.map(({ month, summary, hasData }) => (
          <li key={month} className={cn(!hasData && "opacity-50")}>
            <Link href={href(month)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold">
                {formatMonthShort(month)}
              </div>
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                <p className="text-sm font-medium text-foreground">
                  {minutesToDuration(summary.totalWorkedMinutes)} worked
                </p>
                {summary.daysCompletedCount} days
                {summary.halfDaysCount > 0 && ` · ${summary.halfDaysCount} half`}
                {summary.leaveDaysCount > 0 && ` · ${summary.leaveDaysCount} leave`}
              </div>
              <span className={cn("text-sm font-semibold tabular-nums", balanceClass(summary.balanceMinutes))}>
                {hasData ? minutesToDurationSigned(summary.balanceMinutes) : "—"}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Month</th>
              <th className="px-3 py-3 font-medium">Worked</th>
              <th className="px-3 py-3 font-medium">Expected</th>
              <th className="px-3 py-3 font-medium">Balance</th>
              <th className="px-3 py-3 font-medium">Days</th>
              <th className="px-3 py-3 font-medium">Half days</th>
              <th className="px-3 py-3 font-medium">Leave</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {months.map(({ month, summary, hasData }) => (
              <tr
                key={month}
                className={cn("group transition-colors hover:bg-muted/40", !hasData && "text-muted-foreground")}
              >
                <td className="whitespace-nowrap px-5 py-3 font-medium">
                  <Link href={href(month)} className="hover:text-brand-600">
                    {formatMonthLabel(year, month)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                  {hasData ? minutesToDuration(summary.totalWorkedMinutes) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {hasData ? minutesToDuration(summary.totalExpectedMinutes) : "—"}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-3 font-medium tabular-nums",
                    balanceClass(summary.balanceMinutes)
                  )}
                >
                  {hasData ? minutesToDurationSigned(summary.balanceMinutes) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {hasData ? `${summary.daysCompletedCount} / ${summary.workingDaysCount}` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {summary.halfDaysCount || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">
                  {summary.leaveDaysCount || "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <Link
                    href={href(month)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-brand-600"
                  >
                    View <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
