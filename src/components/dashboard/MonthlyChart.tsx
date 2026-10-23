"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { DayRow } from "@/lib/calendar";
import { balanceAxis, formatBalanceTick } from "@/lib/chart";
import { minutesToDurationSigned } from "@/lib/time";

const UNCOUNTED = new Set(["non-working", "future", "leave", "not-tracked"]);

export function MonthlyChart({ rows }: { rows: DayRow[] }) {
  const data = rows
    .filter((r) => !UNCOUNTED.has(r.status))
    .map((r) => {
      // Today's running total isn't final, so it stays out of the chart like it does the balance.
      const recorded = r.differenceMinutes != null && r.status !== "in-progress";
      return {
        day: r.date.getUTCDate(),
        difference: recorded ? r.differenceMinutes! : 0,
        status: r.status,
        recorded,
      };
    });

  const hasAnyData = data.some((d) => d.recorded);
  const { ticks, domain } = balanceAxis(data.map((d) => d.difference));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily balance</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyData ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval={2}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  ticks={ticks}
                  domain={domain}
                  tickFormatter={formatBalanceTick}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
                  formatter={(value: number) => [minutesToDurationSigned(value), "Balance"]}
                  labelFormatter={(label) => `Day ${label}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="difference" radius={[4, 4, 4, 4]} maxBarSize={18}>
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.difference > 0
                          ? "hsl(var(--extra))"
                          : entry.difference < 0
                          ? "hsl(var(--less))"
                          : "hsl(var(--muted-foreground))"
                      }
                      fillOpacity={entry.difference === 0 ? 0.3 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No attendance recorded for this month yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
