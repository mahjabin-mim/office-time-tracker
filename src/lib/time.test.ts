import { describe, expect, it } from "vitest";
import {
  addDays,
  clockToMinutes,
  computeDayStatus,
  computeExtra,
  computeWorkedMinutes,
  dateKeyToDate,
  formatDayLabel,
  formatMonthLabel,
  getZonedNow,
  isLateEntry,
  isLeaveType,
  isValidTimeZone,
  isWorkingDay,
  minutesToClock,
  minutesToDuration,
  minutesToDurationSigned,
  parseWorkingDays,
  toDateKey,
} from "@/lib/time";

const H = 60;

describe("clock and duration formatting", () => {
  it("formats minutes as 12h and 24h clock times", () => {
    expect(minutesToClock(9 * H + 5)).toBe("09:05 AM");
    expect(minutesToClock(0)).toBe("12:00 AM");
    expect(minutesToClock(12 * H)).toBe("12:00 PM");
    expect(minutesToClock(18 * H + 30, "24h")).toBe("18:30");
    // Wraps past midnight for overnight leave times
    expect(minutesToClock(24 * H + 15, "24h")).toBe("00:15");
  });

  it("parses HH:mm input values", () => {
    expect(clockToMinutes("09:30")).toBe(570);
    expect(clockToMinutes("23:59")).toBe(1439);
    expect(clockToMinutes("24:00")).toBeNull();
    expect(clockToMinutes("9:30")).toBeNull();
    expect(clockToMinutes("")).toBeNull();
  });

  it("formats durations with and without a sign", () => {
    expect(minutesToDuration(45)).toBe("45m");
    expect(minutesToDuration(9 * H)).toBe("9h 00m");
    expect(minutesToDuration(-75)).toBe("-1h 15m");
    expect(minutesToDurationSigned(30)).toBe("+30m");
    expect(minutesToDurationSigned(-90)).toBe("-1h 30m");
    expect(minutesToDurationSigned(0)).toBe("0m");
  });
});

describe("computeWorkedMinutes", () => {
  it("is simply the time from entry to out, with no break deducted", () => {
    expect(computeWorkedMinutes(9 * H, 18 * H)).toBe(9 * H);
  });

  it("treats an out time before the entry as an overnight shift", () => {
    expect(computeWorkedMinutes(22 * H, 6 * H)).toBe(8 * H);
  });

  it("needs both times", () => {
    expect(computeWorkedMinutes(9 * H, 9 * H + 30)).toBe(30);
    expect(computeWorkedMinutes(null, 18 * H)).toBeNull();
    expect(computeWorkedMinutes(9 * H, undefined)).toBeNull();
  });
});

describe("calendar days (UTC midnight)", () => {
  it("round-trips date keys regardless of the machine's time zone", () => {
    const date = dateKeyToDate("2026-10-23");
    expect(date.toISOString()).toBe("2026-10-23T00:00:00.000Z");
    expect(toDateKey(date)).toBe("2026-10-23");
  });

  it("adds days across month and year boundaries", () => {
    expect(toDateKey(addDays(dateKeyToDate("2026-10-31"), 1))).toBe("2026-11-01");
    expect(toDateKey(addDays(dateKeyToDate("2026-01-01"), -1))).toBe("2025-12-31");
  });

  it("checks working days by weekday", () => {
    const sunToThu = parseWorkingDays("0,1,2,3,4");
    expect(isWorkingDay(dateKeyToDate("2026-10-22"), sunToThu)).toBe(true); // Thursday
    expect(isWorkingDay(dateKeyToDate("2026-10-23"), sunToThu)).toBe(false); // Friday
  });

  it("labels days and months without shifting them", () => {
    expect(formatDayLabel(dateKeyToDate("2026-10-23"))).toBe("Friday, October 23");
    expect(formatMonthLabel(2026, 0)).toBe("January 2026");
  });
});

describe("time zones", () => {
  // 2026-10-23 08:15 UTC
  const instant = new Date(Date.UTC(2026, 9, 23, 8, 15));

  it("gives each user their own local date and time", () => {
    const dhaka = getZonedNow("Asia/Dhaka", instant); // UTC+6
    expect(dhaka.dateKey).toBe("2026-10-23");
    expect(dhaka.minutes).toBe(14 * H + 15);
    expect(dhaka.hour).toBe(14);

    const honolulu = getZonedNow("Pacific/Honolulu", instant); // UTC-10
    expect(honolulu.dateKey).toBe("2026-10-22");
    expect(honolulu.minutes).toBe(22 * H + 15);
    expect(honolulu.month).toBe(9);
  });

  it("falls back to UTC for missing or invalid zones", () => {
    expect(getZonedNow(null, instant).minutes).toBe(8 * H + 15);
    expect(getZonedNow("Not/AZone", instant).dateKey).toBe("2026-10-23");
    expect(isValidTimeZone("Asia/Dhaka")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });

  it("reports midnight as hour 0", () => {
    const midnight = getZonedNow("UTC", new Date(Date.UTC(2026, 9, 23, 0, 5)));
    expect(midnight.hour).toBe(0);
    expect(midnight.minutes).toBe(5);
  });
});

describe("computeDayStatus", () => {
  const base = {
    dateKey: "2026-10-22",
    todayKey: "2026-10-23",
    nowMinutes: 14 * H,
    isWorking: true,
    entryMinutes: 9 * H,
    outMinutes: 18 * H,
    expectedDailyMinutes: 9 * H,
  };

  it("marks a full day on target, extra, or less", () => {
    expect(computeDayStatus(base)).toMatchObject({
      status: "on-target",
      workedMinutes: 9 * H,
      differenceMinutes: 0,
      countsTowardBalance: true,
    });
    expect(computeDayStatus({ ...base, outMinutes: 18 * H + 30 })).toMatchObject({
      status: "extra",
      differenceMinutes: 30,
    });
    expect(computeDayStatus({ ...base, outMinutes: 17 * H })).toMatchObject({
      status: "less",
      differenceMinutes: -60,
    });
  });

  it("uses the half-day length on half days", () => {
    const halfDay = computeDayStatus({
      ...base,
      isHalfDay: true,
      halfDayMinutes: 4.5 * H,
      outMinutes: 13 * H + 30,
    });
    expect(halfDay).toMatchObject({
      status: "on-target",
      expectedMinutes: 270,
      workedMinutes: 270,
    });
    expect(
      computeDayStatus({ ...base, isHalfDay: true, halfDayMinutes: 4 * H, outMinutes: 13 * H })
    ).toMatchObject({ status: "on-target", expectedMinutes: 240 });
  });

  it("counts every minute worked on a day off as extra", () => {
    expect(
      computeDayStatus({ ...base, isWorking: false, entryMinutes: 10 * H, outMinutes: 12 * H })
    ).toMatchObject({ status: "extra", expectedMinutes: 0, differenceMinutes: 120 });
  });

  it("never counts leave or holidays, even when times exist or the day is in the future", () => {
    for (const leaveType of ["leave", "sick", "holiday"] as const) {
      expect(computeDayStatus({ ...base, leaveType })).toMatchObject({
        status: "leave",
        expectedMinutes: 0,
        differenceMinutes: null,
        countsTowardBalance: false,
      });
    }
    expect(
      computeDayStatus({ ...base, dateKey: "2026-10-26", leaveType: "holiday" }).status
    ).toBe("leave");
  });

  it("treats future days, empty days off, and pre-signup days as not counted", () => {
    expect(computeDayStatus({ ...base, dateKey: "2026-10-24" }).status).toBe("future");
    expect(
      computeDayStatus({ ...base, isWorking: false, entryMinutes: null, outMinutes: null }).status
    ).toBe("non-working");
    expect(
      computeDayStatus({
        ...base,
        entryMinutes: null,
        outMinutes: null,
        trackingStartKey: "2026-10-23",
      }).status
    ).toBe("not-tracked");
  });

  it("still counts a backfilled record from before signup", () => {
    expect(computeDayStatus({ ...base, trackingStartKey: "2026-10-23" }).status).toBe("on-target");
  });

  it("flags an empty working day as missing and a one-sided past day as incomplete", () => {
    expect(computeDayStatus({ ...base, entryMinutes: null, outMinutes: null }).status).toBe("missing");
    expect(computeDayStatus({ ...base, entryMinutes: null }).status).toBe("incomplete");
    expect(computeDayStatus({ ...base, outMinutes: null }).status).toBe("incomplete");
  });

  it("tracks today's open day as in progress up to now", () => {
    const today = { ...base, dateKey: "2026-10-23", outMinutes: null };
    expect(computeDayStatus(today)).toMatchObject({
      status: "in-progress",
      workedMinutes: 5 * H, // 09:00 → 14:00
      differenceMinutes: -4 * H,
      countsTowardBalance: false,
    });
  });

  it("does not mistake a just-started or later entry for a 24h overnight shift", () => {
    const today = { ...base, dateKey: "2026-10-23", outMinutes: null };
    expect(computeDayStatus({ ...today, entryMinutes: 14 * H }).workedMinutes).toBe(0);
    expect(computeDayStatus({ ...today, entryMinutes: 15 * H }).workedMinutes).toBe(0);
  });
});

describe("isLeaveType", () => {
  it("accepts only the known leave kinds", () => {
    expect(isLeaveType("sick")).toBe(true);
    expect(isLeaveType("vacation")).toBe(false);
    expect(isLeaveType(null)).toBe(false);
  });
});

describe("computeExtra", () => {
  const base = { dateKey: "2026-10-22", todayKey: "2026-10-22", nowMinutes: 20 * H };

  it("is empty with no session", () => {
    expect(computeExtra({ ...base, extraEntryMinutes: null, extraOutMinutes: null })).toEqual({
      minutes: null,
      inProgress: false,
    });
  });

  it("returns the length of a finished session", () => {
    expect(computeExtra({ ...base, extraEntryMinutes: 18 * H, extraOutMinutes: 19 * H + 30 })).toEqual({
      minutes: 90,
      inProgress: false,
    });
    // the midnight carry-over: closed at 11:59 PM, continued from 12:00 AM
    expect(computeExtra({ ...base, extraEntryMinutes: 22 * H, extraOutMinutes: 1439 })).toMatchObject({
      minutes: 119,
    });
  });

  it("runs live for an open session today and not for an open one on a past day", () => {
    expect(computeExtra({ ...base, extraEntryMinutes: 18 * H, extraOutMinutes: null })).toEqual({
      minutes: 2 * H,
      inProgress: true,
    });
    expect(
      computeExtra({ ...base, dateKey: "2026-10-21", extraEntryMinutes: 18 * H, extraOutMinutes: null })
    ).toEqual({ minutes: null, inProgress: false });
  });
});

describe("isLateEntry", () => {
  it("is late only strictly after the set time", () => {
    expect(isLateEntry(9 * H + 16, 9 * H + 15)).toBe(true);
    expect(isLateEntry(9 * H + 15, 9 * H + 15)).toBe(false);
    expect(isLateEntry(null, 9 * H)).toBe(false);
    expect(isLateEntry(10 * H, null)).toBe(false);
  });
});
