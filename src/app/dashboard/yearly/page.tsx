import { getOrCreateSchedule, getUserNow, getYearRows, requireCurrentUser } from "@/lib/data";
import { summarizeByMonth, summarizeRows } from "@/lib/calendar";
import { formatMonthShort } from "@/lib/time";
import { parsePeriod } from "@/lib/period";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ExportLink } from "@/components/dashboard/ExportLink";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { YearlyChart, type YearlyChartPoint } from "@/components/dashboard/YearlyChart";
import { YearTable } from "@/components/dashboard/YearTable";
import { Reveal } from "@/components/ui/Reveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export default async function YearlyOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireCurrentUser();
  const schedule = await getOrCreateSchedule(user.id);
  const now = getUserNow(user);
  const { year } = parsePeriod(await searchParams, now);

  const rows = await getYearRows(user, schedule, year);
  const summary = summarizeRows(rows);
  const months = summarizeByMonth(rows);

  // The running-total line spans only tracked months: from the first one with data through the
  // current month, instead of flat-lining before signup or into the future.
  const lastElapsedMonth = year < now.year ? 11 : year === now.year ? now.month : -1;
  const firstTrackedMonth = months.find((m) => m.hasData)?.month ?? 12;
  let running = 0;
  const chartData: YearlyChartPoint[] = months.map(({ month, summary: m }) => {
    const elapsed = month >= firstTrackedMonth && month <= lastElapsedMonth;
    if (elapsed) running += m.balanceMinutes;
    return {
      label: formatMonthShort(month),
      balance: m.balanceMinutes,
      cumulative: elapsed ? running : null,
    };
  });

  const best = months
    .filter((m) => m.hasData)
    .reduce<(typeof months)[number] | null>(
      (top, m) => (!top || m.summary.balanceMinutes > top.summary.balanceMinutes ? m : top),
      null
    );

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
      hint: best ? `Best month: ${formatMonthShort(best.month)}` : undefined,
    },
    { label: "Half days", value: summary.halfDaysCount, format: "count" as const },
    { label: "Leave & holidays", value: summary.leaveDaysCount, format: "count" as const },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Yearly Overview</h1>
          <p className="mt-1 text-muted-foreground">How your balance is trending, month by month.</p>
        </Reveal>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector
            label={String(year)}
            prevHref={`/dashboard/yearly?year=${year - 1}`}
            nextHref={year >= now.year ? null : `/dashboard/yearly?year=${year + 1}`}
            prevLabel="Previous year"
            nextLabel="Next year"
          />
          <ExportLink href={`/api/export?format=csv&year=${year}`} />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05} className="lg:row-span-2">
          <BalanceHero summary={summary} period="year" />
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
        <YearlyChart data={chartData} />
      </Reveal>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Months
        </h2>
        <Reveal delay={0.35}>
          <YearTable year={year} months={months} />
        </Reveal>
      </section>
    </div>
  );
}
