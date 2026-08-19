"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { minutesToDuration, minutesToDurationSigned } from "@/lib/time";

type Format = "duration" | "signed" | "count";

const FORMATTERS: Record<Format, (n: number) => string> = {
  duration: minutesToDuration,
  signed: minutesToDurationSigned,
  count: (n) => String(Math.round(n)),
};

export function AnimatedNumber({
  value,
  format,
  duration = 0.8,
}: {
  value: number;
  format: Format;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
    });
    prevRef.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{FORMATTERS[format](display)}</>;
}
