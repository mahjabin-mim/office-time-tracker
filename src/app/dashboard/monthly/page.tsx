import {
  getMonthRows,
  getOrCreateSchedule,
  getUserNow,
  requireCurrentUser,
  summarizeRows,
} from "@/lib/data";
import { formatMonthLabel, minutesToClock } from "@/lib/time";
import { parsePeriod } from "@/lib/period";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ExportLink } from "@/components/dashboard/ExportLink";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { MonthlyAttendance } from "@/components/dashboard/MonthlyAttendance";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { Reveal } from "@/components/ui/Reveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export default async function MonthlySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireCurrentUser();
  const schedule = await getOrCreateSchedule(user.id);
  const timeFormat = user.timeFormat as "12h" | "24h";

  const now = getUserNow(user);
  const { year, month } = parsePeriod(await searchParams, now);
  const rows = await getMonthRows(user, schedule, year, month);
  const summary = summarizeRows(rows);

  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const nextIsFuture = next.year > now.year || (next.year === now.year && next.month > now.month);
  const href = (p: { year: number; month: number }) =>
    `/dashboard/monthly?year=${p.year}&month=${p.month}`;

  const stats = [
    { label: "Total worked", value: summary.totalWorkedMinutes, format: "duration" as const },
    { label: "Expected", value: summary.totalExpectedMinutes, format: "duration" as const },
    {
      label: "Average / day",
      value: summary.averageMinutesPerDay,
      format: "duration" as const,
      tone: "brand" as const,
    },
    {
      label: "Days completed",
      value: summary.daysCompletedCount,
      format: "count" as const,
      hint: [
        `of ${summary.workingDaysCount} working days`,
        summary.daysMissingCount > 0 && `${summary.daysMissingCount} missing`,
        summary.daysOffWorkedCount > 0 && `+${summary.daysOffWorkedCount} day off worked`,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    { label: "Half days", value: summary.halfDaysCount, format: "count" as const },
    {
      label: "Extra hours",
      value: summary.totalExtraHourMinutes,
      format: "duration" as const,
      hint: "Counted in your balance",
    },
    {
      label: "Late entries",
      value: summary.lateEntriesCount,
      format: "count" as const,
      tone: summary.lateEntriesCount > 0 ? ("less" as const) : undefined,
      hint:
        schedule.lateAfterMinutes != null
          ? `After ${minutesToClock(schedule.lateAfterMinutes, timeFormat)}`
          : "Set a late time in Settings",
    },
    { label: "Leave & holidays", value: summary.leaveDaysCount, format: "count" as const },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Monthly Summary</h1>
          <p className="mt-1 text-muted-foreground">Your complete monthly balance, day by day.</p>
        </Reveal>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector
            label={formatMonthLabel(year, month)}
            prevHref={href(prev)}
            nextHref={nextIsFuture ? null : href(next)}
            prevLabel="Previous month"
            nextLabel="Next month"
          />
          <ExportLink href={`/api/export?format=csv&year=${year}&month=${month}`} />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05} className="lg:row-span-2">
          <BalanceHero summary={summary} period="month" />
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={0.1 + i * 0.03} className="h-full">
              <SummaryCard
                className="h-full"
                label={stat.label}
                value={<AnimatedNumber value={stat.value} format={stat.format} />}
                hint={stat.hint}
                tone={stat.tone}
              />
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal delay={0.3}>
        <MonthlyChart rows={rows} />
      </Reveal>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Monthly Attendance
        </h2>
        <Reveal delay={0.35}>
          <MonthlyAttendance
            rows={rows}
            timeFormat={timeFormat}
            halfDayMinutes={schedule.halfDayMinutes}
          />
        </Reveal>
      </section>
    </div>
  );
}
