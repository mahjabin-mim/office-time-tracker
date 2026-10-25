import { describe, expect, it } from "vitest";
import {
  buildDayRows,
  leaveAtMinutes,
  summarizeByMonth,
  summarizeRows,
  type AttendanceLike,
} from "@/lib/calendar";
import { dateKeyToDate, getZonedNow } from "@/lib/time";

const H = 60;
const schedule = {
  expectedDailyMinutes: 9 * H,
  halfDayMinutes: 4.5 * H,
  workingDays: "0,1,2,3,4", // Sun–Thu
};
// Friday 2026-10-23, 14:00 in Dhaka
const now = getZonedNow("Asia/Dhaka", new Date(Date.UTC(2026, 9, 23, 8, 0)));

function record(dateKey: string, fields: Partial<AttendanceLike> = {}): AttendanceLike {
  return {
    date: dateKeyToDate(dateKey),
    entryMinutes: 9 * H,
    outMinutes: 18 * H,
    isHalfDay: false,
    leaveType: null,
    ...fields,
  };
}

function rowsFor(records: AttendanceLike[], trackingStartKey?: string) {
  return buildDayRows({
    rangeStart: dateKeyToDate("2026-10-01"),
    rangeEnd: dateKeyToDate("2026-10-31"),
    records,
    schedule,
    now,
    trackingStartKey,
  });
}

describe("buildDayRows", () => {
  it("returns one row per calendar day with today and future flags", () => {
    const rows = rowsFor([]);
    expect(rows).toHaveLength(31);
    expect(rows[0].dateKey).toBe("2026-10-01");
    expect(rows.at(-1)!.dateKey).toBe("2026-10-31");
    expect(rows.filter((r) => r.isToday).map((r) => r.dateKey)).toEqual(["2026-10-23"]);
    expect(rows.find((r) => r.dateKey === "2026-10-24")!.isFuture).toBe(true);
  });

  it("marks working days from the schedule", () => {
    const rows = rowsFor([]);
    expect(rows.find((r) => r.dateKey === "2026-10-22")!.isWorkingDay).toBe(true); // Thu
    expect(rows.find((r) => r.dateKey === "2026-10-23")!.isWorkingDay).toBe(false); // Fri
  });

  it("ignores unknown leave types instead of trusting them", () => {
    const [row] = rowsFor([record("2026-10-01", { leaveType: "vacation" })]);
    expect(row.leaveType).toBeNull();
    expect(row.status).toBe("on-target");
  });

  it("shows days before signup as not tracked rather than missing", () => {
    const rows = rowsFor([], "2026-10-20");
    expect(rows.find((r) => r.dateKey === "2026-10-19")!.status).toBe("not-tracked");
    expect(rows.find((r) => r.dateKey === "2026-10-20")!.status).toBe("missing");
  });
});

describe("summarizeRows", () => {
  const rows = rowsFor(
    [
      record("2026-10-01", { outMinutes: 18 * H + 30 }), // +30m
      record("2026-10-04", { isHalfDay: true, outMinutes: 13 * H }), // half day, -30m
      record("2026-10-05", { outMinutes: 17 * H }), // -1h
      record("2026-10-06", { entryMinutes: null }), // out only → incomplete
      record("2026-10-07", { entryMinutes: null, outMinutes: null, leaveType: "sick" }),
      record("2026-10-09", { entryMinutes: 10 * H, outMinutes: 12 * H }), // Friday: +2h extra
      record("2026-10-26", { entryMinutes: null, outMinutes: null, leaveType: "holiday" }), // planned
      record("2026-10-30", { entryMinutes: null, outMinutes: null, leaveType: "holiday" }), // Fri: ignored
    ],
    "2026-10-01"
  );
  const summary = summarizeRows(rows);

  it("adds up the balance from completed days only", () => {
    expect(summary.totalExtraMinutes).toBe(30 + 2 * H);
    expect(summary.totalLessMinutes).toBe(30 + H);
    expect(summary.balanceMinutes).toBe(H);
    expect(summary.totalWorkedMinutes).toBe(9.5 * H + 4 * H + 8 * H + 2 * H);
    expect(summary.totalExpectedMinutes).toBe(9 * H + 4.5 * H + 9 * H);
  });

  it("counts day-off work separately from working days", () => {
    expect(summary.daysCompletedCount).toBe(3);
    expect(summary.daysOffWorkedCount).toBe(1);
    expect(summary.averageMinutesPerDay).toBe(summary.totalWorkedMinutes / 4);
  });

  it("counts leave only when it replaces a working day, including planned leave", () => {
    expect(summary.leaveDaysCount).toBe(2);
  });

  it("counts half days and missing days", () => {
    expect(summary.halfDaysCount).toBe(1);
    // Oct 1–23 has 16 Sun–Thu days; the sick day isn't expected, leaving 15.
    // 3 are complete, so 12 are missing (11 empty + the out-only Oct 6).
    expect(summary.workingDaysCount).toBe(15);
    expect(summary.daysMissingCount).toBe(12);
  });

  it("is all zeros for an empty period", () => {
    expect(summarizeRows([])).toMatchObject({
      balanceMinutes: 0,
      daysCompletedCount: 0,
      averageMinutesPerDay: 0,
    });
  });
});

describe("summarizeByMonth", () => {
  it("returns twelve months and flags which have data", () => {
    const rows = buildDayRows({
      rangeStart: dateKeyToDate("2026-01-01"),
      rangeEnd: dateKeyToDate("2026-12-31"),
      records: [record("2026-10-01", { outMinutes: 19 * H })],
      schedule,
      now,
      trackingStartKey: "2026-10-01",
    });
    const months = summarizeByMonth(rows);
    expect(months).toHaveLength(12);
    expect(months[8].hasData).toBe(false); // September: before signup
    expect(months[9].hasData).toBe(true);
    expect(months[9].summary.balanceMinutes).toBe(H);
    expect(months[11].hasData).toBe(false); // December: future
  });
});

describe("leaveAtMinutes", () => {
  it("is entry + expected hours", () => {
    expect(leaveAtMinutes({ entryMinutes: 9 * H, expectedMinutes: 9 * H })).toBe(18 * H);
    expect(leaveAtMinutes({ entryMinutes: null, expectedMinutes: 9 * H })).toBeNull();
  });
});

describe("extra hours", () => {
  it("counts a finished session in full, on top of the regular day", () => {
    const rows = rowsFor([
      record("2026-10-01", { extraEntryMinutes: 19 * H, extraOutMinutes: 21 * H + 30 }),
    ]);
    const row = rows.find((r) => r.dateKey === "2026-10-01")!;
    expect(row.extraMinutes).toBe(2.5 * H);
    expect(row.extraInProgress).toBe(false);
    expect(row.workedMinutes).toBe(9 * H); // regular time is untouched

    const summary = summarizeRows(rows);
    expect(summary.totalExtraHourMinutes).toBe(2.5 * H);
    expect(summary.totalExtraMinutes).toBe(2.5 * H);
    expect(summary.balanceMinutes).toBe(2.5 * H);
    expect(summary.totalWorkedMinutes).toBe(9 * H);
  });

  it("counts extra hours on leave days and days off", () => {
    const rows = rowsFor([
      record("2026-10-01", { entryMinutes: null, outMinutes: null, leaveType: "holiday", extraEntryMinutes: 10 * H, extraOutMinutes: 12 * H }),
      record("2026-10-02", { entryMinutes: null, outMinutes: null, extraEntryMinutes: 10 * H, extraOutMinutes: 11 * H }), // Friday
    ]);
    expect(summarizeRows(rows).totalExtraHourMinutes).toBe(3 * H);
  });

  it("shows today's open session as running but leaves it out of the balance", () => {
    // now is 14:00 on Friday 2026-10-23
    const rows = rowsFor([record("2026-10-23", { extraEntryMinutes: 12 * H })]);
    const row = rows.find((r) => r.dateKey === "2026-10-23")!;
    expect(row.extraInProgress).toBe(true);
    expect(row.extraMinutes).toBe(2 * H);
    expect(summarizeRows(rows).totalExtraHourMinutes).toBe(0);
  });

  it("flags a month that only has extra hours as having data", () => {
    const rows = buildDayRows({
      rangeStart: dateKeyToDate("2026-01-01"),
      rangeEnd: dateKeyToDate("2026-12-31"),
      records: [record("2026-02-06", { entryMinutes: null, outMinutes: null, extraEntryMinutes: 600, extraOutMinutes: 660 })], // a Friday
      schedule,
      now,
    });
    expect(summarizeByMonth(rows)[1].hasData).toBe(true);
  });
});

describe("late entries", () => {
  const lateSchedule = { ...schedule, lateAfterMinutes: 9 * H + 15 };

  function lateRows(records: AttendanceLike[]) {
    return buildDayRows({
      rangeStart: dateKeyToDate("2026-10-01"),
      rangeEnd: dateKeyToDate("2026-10-31"),
      records,
      schedule: lateSchedule,
      now,
    });
  }

  it("marks working-day entries after the late time and counts them", () => {
    const rows = lateRows([
      record("2026-10-01", { entryMinutes: 9 * H + 15 }), // exactly on time
      record("2026-10-04", { entryMinutes: 9 * H + 16 }), // late
      record("2026-10-05", { entryMinutes: 10 * H }), // late
      record("2026-10-06", { entryMinutes: 8 * H }),
      record("2026-10-09", { entryMinutes: 11 * H }), // Friday is a day off
      record("2026-10-07", { entryMinutes: null, outMinutes: null, leaveType: "leave" }),
    ]);
    expect(rows.filter((r) => r.isLate).map((r) => r.dateKey)).toEqual(["2026-10-04", "2026-10-05"]);
    expect(summarizeRows(rows).lateEntriesCount).toBe(2);
  });

  it("counts nothing when no late time is set", () => {
    const rows = rowsFor([record("2026-10-04", { entryMinutes: 12 * H })]);
    expect(rows.some((r) => r.isLate)).toBe(false);
    expect(summarizeRows(rows).lateEntriesCount).toBe(0);
  });
});
