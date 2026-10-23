const TICK_STEPS = [30, 60, 120, 180, 240, 360, 480, 720, 1200, 1800, 3000, 6000];

/** A symmetric axis on round half-hour/hour steps, so 0 sits in the middle of a balance chart. */
export function balanceAxis(values: number[]): { ticks: number[]; domain: [number, number] } {
  const maxAbs = Math.max(30, ...values.map((v) => Math.abs(v)));
  const step = TICK_STEPS.find((s) => maxAbs / s <= 3) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const top = Math.ceil(maxAbs / step) * step;
  const ticks: number[] = [];
  for (let v = -top; v <= top; v += step) ticks.push(v);
  return { ticks, domain: [-top, top] };
}

export function formatBalanceTick(minutes: number): string {
  if (minutes === 0) return "0";
  if (Math.abs(minutes) < 60) return `${minutes}m`;
  return minutes % 60 === 0 ? `${minutes / 60}h` : `${(minutes / 60).toFixed(1)}h`;
}
