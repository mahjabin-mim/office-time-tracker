"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { DayRow } from "@/lib/data";
import { minutesToDurationSigned } from "@/lib/time";

export function MonthlyChart({ rows }: { rows: DayRow[] }) {
  const data = rows
    .filter((r) => r.status !== "non-working" && r.status !== "future")
    .map((r) => ({
      day: r.date.getDate(),
      difference: r.differenceMinutes ?? 0,
      status: r.status,
      recorded: r.differenceMinutes != null,
    }));

  const hasAnyData = data.some((d) => d.recorded);

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
                  tickFormatter={(v) => `${Math.round(v / 60)}h`}
                />
                <Tooltip
                  formatter={(value: number) => minutesToDurationSigned(value)}
                  labelFormatter={(label) => `Day ${label}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
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
