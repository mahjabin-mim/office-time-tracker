export const LOGIN_WINDOW_MINUTES = 15;
/** Wrong passwords allowed for one email within the window before it's locked. */
export const MAX_FAILURES_PER_ACCOUNT = 5;
/** Failures allowed from one IP address (across all emails) within the window. */
export const MAX_FAILURES_PER_IP = 30;

/**
 * Whether a login is currently blocked, given recent failures (newest first). A lock lifts once
 * enough of those failures age out of the window to drop below the limit.
 */
export function loginLockout(params: {
  accountFailures: Date[];
  ipFailures: Date[];
  now?: Date;
}): { locked: boolean; retryAfterMinutes: number } {
  const now = params.now ?? new Date();
  const windowMs = LOGIN_WINDOW_MINUTES * 60_000;
  const unlockTimes: number[] = [];

  for (const [failures, limit] of [
    [params.accountFailures, MAX_FAILURES_PER_ACCOUNT],
    [params.ipFailures, MAX_FAILURES_PER_IP],
  ] as const) {
    const recent = failures
      .filter((d) => now.getTime() - d.getTime() < windowMs)
      .sort((a, b) => b.getTime() - a.getTime());
    if (recent.length >= limit) unlockTimes.push(recent[limit - 1].getTime() + windowMs);
  }

  if (unlockTimes.length === 0) return { locked: false, retryAfterMinutes: 0 };
  const waitMs = Math.max(...unlockTimes) - now.getTime();
  return { locked: true, retryAfterMinutes: Math.max(1, Math.ceil(waitMs / 60_000)) };
}

/** The client's IP from proxy headers (Vercel sets these; they can't be spoofed by the client). */
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
