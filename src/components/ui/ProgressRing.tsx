"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Circular progress (0–100) with an animated sweep; children render in the middle. */
export function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  tone = "brand",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "brand" | "extra" | "less";
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const gradientId = `ring-${tone}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {tone === "brand" ? (
              <>
                <stop offset="0%" stopColor="#7c4dff" />
                <stop offset="100%" stopColor="#d946ef" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor={`hsl(var(--${tone}))`} />
                <stop offset="100%" stopColor={`hsl(var(--${tone}) / 0.7)`} />
              </>
            )}
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct / 100 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className={cn(pct === 0 && "opacity-0")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
