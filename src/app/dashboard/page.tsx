import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getMonthRows,
  getOrCreateSchedule,
  getRecentRows,
  requireCurrentUser,
  summarizeMonth,
} from "@/lib/data";
import { toDateKey } from "@/lib/time";
import { TodayCard } from "@/components/dashboard/TodayCard";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { RecentAttendanceList } from "@/components/dashboard/RecentAttendanceList";
import { Reveal } from "@/components/ui/Reveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const schedule = await getOrCreateSchedule(user.id);
  const timeFormat = user.timeFormat as "12h" | "24h";

  const now = new Date();
  const monthRows = await getMonthRows(user, schedule, now.getFullYear(), now.getMonth());
  const summary = summarizeMonth(monthRows);
  const recentRows = await getRecentRows(user, schedule, 10);

  const todayKey = toDateKey(now);
  const todayRow = monthRows.find((r) => r.dateKey === todayKey)!;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <Reveal>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}, {user.name} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </Reveal>

      <section>
        <SectionHeading title="Today's Time" />
        <Reveal delay={0.05}>
          <TodayCard
            today={now}
            entryMinutes={todayRow.entryMinutes}
            outMinutes={todayRow.outMinutes}
            status={todayRow.status}
            workedMinutes={todayRow.workedMinutes}
            expectedMinutes={todayRow.expectedMinutes}
            differenceMinutes={todayRow.differenceMinutes}
            timeFormat={timeFormat}
          />
        </Reveal>
      </section>

      <section>
        <SectionHeading
          title="This Month"
          action={
            <Link
              href="/dashboard/monthly"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-transform hover:translate-x-0.5 hover:text-brand-700"
            >
              View details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0.1}>
            <SummaryCard
              label="Monthly balance"
              value={
                <AnimatedNumber value={summary.balanceMinutes} format="signed" />
              }
              hint={summary.balanceMinutes >= 0 ? "Extra time this month" : "Less time this month"}
              tone={summary.balanceMinutes >= 0 ? "extra" : "less"}
            />
          </Reveal>
          <Reveal delay={0.15}>
            <SummaryCard
              label="Total worked"
              value={<AnimatedNumber value={summary.totalWorkedMinutes} format="duration" />}
              hint={`${summary.daysCompletedCount} days completed`}
            />
          </Reveal>
          <Reveal delay={0.2}>
            <SummaryCard
              label="Expected hours"
              value={
                <AnimatedNumber value={summary.totalExpectedMinutes} format="duration" />
              }
              hint={`${summary.workingDaysCount} working days`}
            />
          </Reveal>
          <Reveal delay={0.25}>
            <SummaryCard
              label="Average / day"
              value={
                <AnimatedNumber value={summary.averageMinutesPerDay} format="duration" />
              }
              hint="Across completed days"
              tone="brand"
            />
          </Reveal>
        </div>
      </section>

      <section>
        <SectionHeading title="Recent Attendance" />
        <Reveal delay={0.3}>
          <RecentAttendanceList rows={recentRows} timeFormat={timeFormat} />
        </Reveal>
      </section>
    </div>
  );
}

function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}
