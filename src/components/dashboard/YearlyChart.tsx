"use client";

import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { balanceAxis, formatBalanceTick } from "@/lib/chart";
import { minutesToDurationSigned } from "@/lib/time";

export interface YearlyChartPoint {
  label: string;
  balance: number;
  /** Running balance up to and including this month; null for months that haven't happened. */
  cumulative: number | null;
}

export function YearlyChart({ data }: { data: YearlyChartPoint[] }) {
  const hasAnyData = data.some((d) => d.balance !== 0);
  const { ticks, domain } = balanceAxis(
    data.flatMap((d) => [d.balance, d.cumulative ?? 0])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance by month</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-extra" /> Month
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-brand-500" /> Running total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {hasAnyData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                  formatter={(value: number, name: string) => [
                    minutesToDurationSigned(value),
                    name === "cumulative" ? "Running total" : "Month",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="balance" radius={[6, 6, 6, 6]} maxBarSize={28}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.balance >= 0 ? "hsl(var(--extra))" : "hsl(var(--less))"}
                      fillOpacity={entry.balance === 0 ? 0.25 : 0.85}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--ring))"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--ring))" }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No completed days recorded for this year yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
