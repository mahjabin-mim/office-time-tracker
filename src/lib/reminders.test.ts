import { describe, expect, it } from "vitest";
import { buildDayRows, type AttendanceLike } from "@/lib/calendar";
import { CLOCK_IN_GRACE_MINUTES, CLOCK_OUT_GRACE_MINUTES, dueReminders } from "@/lib/reminders";
import { dateKeyToDate, getZonedNow } from "@/lib/time";

const H = 60;
const schedule = {
  expectedDailyMinutes: 9 * H,
  breakMinutes: 60,
  halfDayMinutes: 4.5 * H,
  workingDays: "0,1,2,3,4",
  workStartMinutes: 9 * H,
  workEndMinutes: 19 * H,
};
const allOn = { remindClockIn: true, remindLeave: true, remindClockOut: true };

/** Thursday 2026-10-22 at the given local time in Dhaka. */
function at(minutes: number) {
  const utcMinutes = minutes - 6 * H;
  return getZonedNow("Asia/Dhaka", new Date(Date.UTC(2026, 9, 22, 0, utcMinutes)));
}

function kindsAt(minutes: number, record: Partial<AttendanceLike> | null, prefs = allOn) {
  const now = at(minutes);
  const [today] = buildDayRows({
    rangeStart: now.date,
    rangeEnd: now.date,
    records: record
      ? [
          {
            date: dateKeyToDate("2026-10-22"),
            entryMinutes: null,
            outMinutes: null,
            isHalfDay: false,
            leaveType: null,
            ...record,
          },
        ]
      : [],
    schedule,
    now,
  });
  return dueReminders({
    today,
    now,
    prefs,
    workStartMinutes: schedule.workStartMinutes,
    workEndMinutes: schedule.workEndMinutes,
  }).map((r) => r.kind);
}

describe("dueReminders", () => {
  it("nudges to clock in only after the grace period and before work ends", () => {
    expect(kindsAt(9 * H + CLOCK_IN_GRACE_MINUTES - 1, null)).toEqual([]);
    expect(kindsAt(9 * H + CLOCK_IN_GRACE_MINUTES, null)).toEqual(["clock-in"]);
    expect(kindsAt(19 * H, null)).toEqual([]);
  });

  it("says it's time to leave once the expected hours are done", () => {
    const entry = { entryMinutes: 9 * H }; // leave at 19:00 with the 1h break
    expect(kindsAt(18 * H + 59, entry)).toEqual([]);
    expect(kindsAt(19 * H, entry)).toEqual(["leave"]);
  });

  it("switches to a clock-out nudge well past the leave time", () => {
    const entry = { entryMinutes: 9 * H };
    expect(kindsAt(19 * H + CLOCK_OUT_GRACE_MINUTES - 1, entry)).toEqual(["leave"]);
    expect(kindsAt(19 * H + CLOCK_OUT_GRACE_MINUTES, entry)).toEqual(["clock-out"]);
  });

  it("uses the half-day length for the leave time", () => {
    expect(kindsAt(13 * H + 30, { entryMinutes: 9 * H, isHalfDay: true })).toEqual(["leave"]);
  });

  it("sends nothing once the day is closed, on leave, or when turned off", () => {
    expect(kindsAt(20 * H, { entryMinutes: 9 * H, outMinutes: 19 * H })).toEqual([]);
    expect(kindsAt(10 * H + 30, { leaveType: "sick" })).toEqual([]);
    expect(
      kindsAt(19 * H, { entryMinutes: 9 * H }, { ...allOn, remindLeave: false })
    ).toEqual([]);
    expect(kindsAt(10 * H + 30, null, { ...allOn, remindClockIn: false })).toEqual([]);
  });

  it("stays quiet on days off", () => {
    const friday = getZonedNow("Asia/Dhaka", new Date(Date.UTC(2026, 9, 23, 5, 0)));
    const [today] = buildDayRows({
      rangeStart: friday.date,
      rangeEnd: friday.date,
      records: [],
      schedule,
      now: friday,
    });
    expect(
      dueReminders({ today, now: friday, prefs: allOn, workStartMinutes: 9 * H, workEndMinutes: 19 * H })
    ).toEqual([]);
  });
});
