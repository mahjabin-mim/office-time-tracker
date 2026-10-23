"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { cn } from "@/lib/cn";
import { minutesToDuration } from "@/lib/time";

/**
 * The ring and headline numbers on the Today card. While the day is in progress the worked time
 * keeps ticking up every minute without a page reload.
 */
export function TodayProgress({
  workedMinutes,
  expectedMinutes,
  differenceMinutes,
  inProgress,
}: {
  workedMinutes: number | null;
  expectedMinutes: number;
  differenceMinutes: number | null;
  inProgress: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!inProgress) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 60_000));
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [inProgress]);

  const worked = (workedMinutes ?? 0) + (inProgress ? elapsed : 0);
  const diff = inProgress ? worked - expectedMinutes : differenceMinutes;
  const remaining = Math.max(0, expectedMinutes - worked);
  const progress = expectedMinutes > 0 ? (worked / expectedMinutes) * 100 : 100;
  const tone = inProgress ? "brand" : diff != null && diff < 0 ? "less" : "extra";

  return (
    <div className="flex flex-wrap items-center gap-6">
      <ProgressRing value={workedMinutes == null ? 0 : progress} tone={tone}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {expectedMinutes > 0 ? "Done" : "Extra"}
        </span>
        <span className="text-2xl font-semibold tabular-nums">
          {expectedMinutes > 0 ? (
            <>
              <AnimatedNumber value={Math.min(progress, 999)} format="count" />%
            </>
          ) : (
            "100%"
          )}
        </span>
      </ProgressRing>

      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Worked</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
            {workedMinutes != null ? <AnimatedNumber value={worked} format="duration" /> : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {expectedMinutes > 0
              ? `of ${minutesToDuration(expectedMinutes)} expected`
              : "Day off: all of it is extra"}
          </p>
        </div>

        {(inProgress || diff != null) && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {inProgress ? (remaining > 0 ? "Remaining" : "Extra so far") : "Balance"}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                inProgress && remaining > 0
                  ? "text-brand-600 dark:text-brand-400"
                  : diff != null && diff < 0
                  ? "text-less"
                  : "text-extra"
              )}
            >
              {inProgress && remaining > 0 ? (
                <AnimatedNumber value={remaining} format="duration" />
              ) : (
                <AnimatedNumber value={diff ?? 0} format="signed" />
              )}
              {!inProgress && diff != null && (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  {diff >= 0 ? "Extra" : "Less"}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
