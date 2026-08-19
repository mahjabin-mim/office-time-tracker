import { getMonthRows, getOrCreateSchedule, requireCurrentUser, summarizeMonth } from "@/lib/data";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { AttendanceTable } from "@/components/dashboard/AttendanceTable";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { Reveal } from "@/components/ui/Reveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export default async function MonthlySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  const schedule = await getOrCreateSchedule(user.id);
  const timeFormat = user.timeFormat as "12h" | "24h";

  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth();

  const rows = await getMonthRows(user, schedule, year, month);
  const summary = summarizeMonth(rows);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Reveal>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Monthly Summary</h1>
          <p className="mt-1 text-muted-foreground">
            Your complete monthly balance, day by day.
          </p>
        </Reveal>
        <MonthSelector year={year} month={month} />
      </div>

      <section className="space-y-4">
        <Reveal delay={0.05}>
          <SummaryCard
            label={summary.balanceMinutes >= 0 ? "Extra time this month" : "Less time this month"}
            value={
              <AnimatedNumber value={summary.balanceMinutes} format="signed" />
            }
            tone={summary.balanceMinutes >= 0 ? "extra" : "less"}
            className="sm:max-w-sm"
          />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0.1}>
            <SummaryCard
              label="Total worked"
              value={<AnimatedNumber value={summary.totalWorkedMinutes} format="duration" />}
            />
          </Reveal>
          <Reveal delay={0.13}>
            <SummaryCard
              label="Expected working time"
              value={
                <AnimatedNumber value={summary.totalExpectedMinutes} format="duration" />
              }
            />
          </Reveal>
          <Reveal delay={0.16}>
            <SummaryCard
              label="Total extra time"
              value={<AnimatedNumber value={summary.totalExtraMinutes} format="duration" />}
              tone="extra"
            />
          </Reveal>
          <Reveal delay={0.19}>
            <SummaryCard
              label="Total less time"
              value={<AnimatedNumber value={summary.totalLessMinutes} format="duration" />}
              tone="less"
            />
          </Reveal>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Reveal delay={0.22}>
            <SummaryCard
              label="Working days"
              value={<AnimatedNumber value={summary.workingDaysCount} format="count" />}
            />
          </Reveal>
          <Reveal delay={0.25}>
            <SummaryCard
              label="Days completed"
              value={<AnimatedNumber value={summary.daysCompletedCount} format="count" />}
            />
          </Reveal>
          <Reveal delay={0.28}>
            <SummaryCard
              label="Average hours/day"
              value={
                <AnimatedNumber value={summary.averageMinutesPerDay} format="duration" />
              }
            />
          </Reveal>
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
          <AttendanceTable rows={rows} timeFormat={timeFormat} />
        </Reveal>
      </section>
    </div>
  );
}
