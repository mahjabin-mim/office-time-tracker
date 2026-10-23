import { describe, expect, it } from "vitest";
import {
  MAX_FAILURES_PER_ACCOUNT,
  MAX_FAILURES_PER_IP,
  clientIpFrom,
  loginLockout,
} from "@/lib/rate-limit";

const now = new Date("2026-10-23T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const failures = (count: number, everyMinutes = 1) =>
  Array.from({ length: count }, (_, i) => minutesAgo(i * everyMinutes));

describe("loginLockout", () => {
  it("allows logins below the per-account limit", () => {
    expect(loginLockout({ accountFailures: failures(MAX_FAILURES_PER_ACCOUNT - 1), ipFailures: [], now })).toEqual({
      locked: false,
      retryAfterMinutes: 0,
    });
  });

  it("locks an account after 5 failures and says when it reopens", () => {
    // failures 0,1,2,3,4 minutes ago → the oldest counted one ages out in 15 − 4 = 11 minutes
    expect(loginLockout({ accountFailures: failures(5), ipFailures: [], now })).toEqual({
      locked: true,
      retryAfterMinutes: 11,
    });
  });

  it("ignores failures older than the 15-minute window", () => {
    const old = [minutesAgo(16), minutesAgo(20), minutesAgo(30), minutesAgo(40), minutesAgo(50)];
    expect(loginLockout({ accountFailures: old, ipFailures: [], now }).locked).toBe(false);
  });

  it("limits a single IP across many accounts", () => {
    expect(loginLockout({ accountFailures: [], ipFailures: failures(MAX_FAILURES_PER_IP - 1, 0), now }).locked).toBe(false);
    expect(loginLockout({ accountFailures: [], ipFailures: failures(MAX_FAILURES_PER_IP, 0), now })).toEqual({
      locked: true,
      retryAfterMinutes: 15,
    });
  });

  it("never reports less than a minute to wait", () => {
    const almostExpired = Array.from({ length: 5 }, () => new Date(now.getTime() - (15 * 60_000 - 5_000)));
    expect(loginLockout({ accountFailures: almostExpired, ipFailures: [], now }).retryAfterMinutes).toBe(1);
  });
});

describe("clientIpFrom", () => {
  const h = (values: Record<string, string>) => ({ get: (n: string) => values[n] ?? null });

  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIpFrom(h({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }))).toBe("203.0.113.7");
    expect(clientIpFrom(h({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIpFrom(h({}))).toBe("unknown");
  });
});
