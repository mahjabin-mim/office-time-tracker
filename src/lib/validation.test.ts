import { describe, expect, it } from "vitest";
import {
  attendanceSchema,
  extraHoursSchema,
  deleteAccountSchema,
  pushSubscriptionSchema,
  scheduleSchema,
  signupSchema,
} from "@/lib/validation";
import { parsePeriod } from "@/lib/period";
import { balanceAxis, formatBalanceTick } from "@/lib/chart";

describe("attendanceSchema", () => {
  const base = { date: "2026-10-22", entryTime: "", outTime: "", isHalfDay: false };

  it("needs at least one time for a worked day", () => {
    expect(attendanceSchema.safeParse({ ...base, dayType: "work" }).success).toBe(false);
    expect(attendanceSchema.safeParse({ ...base, dayType: "work", entryTime: "09:00" }).success).toBe(
      true
    );
  });

  it("allows leave and holidays without any times", () => {
    for (const dayType of ["leave", "holiday"]) {
      expect(attendanceSchema.safeParse({ ...base, dayType }).success).toBe(true);
    }
  });

  it("no longer accepts sick as a day type", () => {
    expect(attendanceSchema.safeParse({ ...base, dayType: "sick" }).success).toBe(false);
  });

  it("rejects unknown day types and malformed values", () => {
    expect(attendanceSchema.safeParse({ ...base, dayType: "vacation" }).success).toBe(false);
    expect(
      attendanceSchema.safeParse({ ...base, dayType: "work", entryTime: "9am" }).success
    ).toBe(false);
    expect(attendanceSchema.safeParse({ ...base, dayType: "leave", date: "22/10/2026" }).success).toBe(
      false
    );
  });
});

describe("extraHoursSchema", () => {
  const base = { date: "2026-10-22" };

  it("needs an entry time, with an optional later out time", () => {
    expect(extraHoursSchema.safeParse({ ...base, extraEntryTime: "" }).success).toBe(false);
    expect(extraHoursSchema.safeParse({ ...base, extraEntryTime: "19:00" }).success).toBe(true);
    expect(
      extraHoursSchema.safeParse({ ...base, extraEntryTime: "19:00", extraOutTime: "21:30" }).success
    ).toBe(true);
  });

  it("rejects an out time that isn't after the entry (past-midnight sessions roll over)", () => {
    expect(
      extraHoursSchema.safeParse({ ...base, extraEntryTime: "22:00", extraOutTime: "02:00" }).success
    ).toBe(false);
    expect(
      extraHoursSchema.safeParse({ ...base, extraEntryTime: "22:00", extraOutTime: "22:00" }).success
    ).toBe(false);
  });
});

describe("scheduleSchema", () => {
  const valid = {
    expectedDailyMinutes: 540,
    halfDayMinutes: 270,
    workStartMinutes: 540,
    workEndMinutes: 1140,
    workingDays: [0, 1, 2, 3, 4],
  };

  it("accepts a normal schedule", () => {
    expect(scheduleSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a sensible half-day length and at least one working day", () => {
    expect(scheduleSchema.safeParse({ ...valid, halfDayMinutes: 15 }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...valid, halfDayMinutes: Number.NaN }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...valid, workingDays: [] }).success).toBe(false);
  });
});

describe("account schemas", () => {
  it("validates signup fields and matching passwords", () => {
    const ok = { name: "Fahima", email: "F@Example.com ", password: "longenough", confirmPassword: "longenough" };
    const parsed = signupSchema.safeParse(ok);
    expect(parsed.success && parsed.data.email).toBe("f@example.com");
    expect(signupSchema.safeParse({ ...ok, confirmPassword: "different" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, password: "short", confirmPassword: "short" }).success).toBe(false);
  });

  it("only deletes an account after typing DELETE exactly", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "DELETE", password: "" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirmation: "delete", password: "" }).success).toBe(false);
  });

  it("accepts only https push endpoints with keys", () => {
    const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "k", auth: "a" } };
    expect(pushSubscriptionSchema.safeParse(sub).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ ...sub, endpoint: "http://evil.test" }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...sub, keys: { p256dh: "k" } }).success).toBe(false);
  });
});

describe("parsePeriod", () => {
  const current = { year: 2026, month: 9 };

  it("reads valid year/month params", () => {
    expect(parsePeriod({ year: "2025", month: "0" }, current)).toEqual({ year: 2025, month: 0 });
  });

  it("falls back to the current period for anything invalid", () => {
    expect(parsePeriod({}, current)).toEqual(current);
    expect(parsePeriod({ year: "abc", month: "12" }, current)).toEqual(current);
    expect(parsePeriod({ year: "1999", month: "-1" }, current)).toEqual(current);
  });
});

describe("balanceAxis", () => {
  it("is symmetric around zero on round steps", () => {
    expect(balanceAxis([20, -10])).toEqual({ ticks: [-30, 0, 30], domain: [-30, 30] });
    const { ticks, domain } = balanceAxis([150, -40]);
    expect(domain).toEqual([-180, 180]);
    expect(ticks).toEqual([-180, -120, -60, 0, 60, 120, 180]);
  });

  it("formats ticks compactly", () => {
    expect(formatBalanceTick(0)).toBe("0");
    expect(formatBalanceTick(30)).toBe("30m");
    expect(formatBalanceTick(-120)).toBe("-2h");
    expect(formatBalanceTick(90)).toBe("1.5h");
  });
});
