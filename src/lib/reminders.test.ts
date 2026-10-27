import { describe, expect, it } from "vitest";
import { buildDayRows, type AttendanceLike } from "@/lib/calendar";
import {
  CLOCK_IN_GRACE_MINUTES,
  CLOCK_OUT_GRACE_MINUTES,
  EXTRA_RUNNING_REMINDER_MINUTES,
  dueReminders,
} from "@/lib/reminders";
import { dateKeyToDate, getZonedNow } from "@/lib/time";

const H = 60;
const schedule = {
  expectedDailyMinutes: 9 * H,
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
    const entry = { entryMinutes: 9 * H }; // 9h expected, so leave at 18:00
    expect(kindsAt(17 * H + 59, entry)).toEqual([]);
    expect(kindsAt(18 * H, entry)).toEqual(["leave"]);
  });

  it("switches to a clock-out nudge well past the leave time", () => {
    const entry = { entryMinutes: 9 * H };
    expect(kindsAt(18 * H + CLOCK_OUT_GRACE_MINUTES - 1, entry)).toEqual(["leave"]);
    expect(kindsAt(18 * H + CLOCK_OUT_GRACE_MINUTES, entry)).toEqual(["clock-out"]);
  });

  it("uses the half-day length for the leave time", () => {
    expect(kindsAt(13 * H + 30, { entryMinutes: 9 * H, isHalfDay: true })).toEqual(["leave"]);
  });

  it("sends nothing once the day is closed, on leave, or when turned off", () => {
    expect(kindsAt(20 * H, { entryMinutes: 9 * H, outMinutes: 18 * H })).toEqual([]);
    expect(kindsAt(10 * H + 30, { leaveType: "sick" })).toEqual([]);
    expect(
      kindsAt(18 * H, { entryMinutes: 9 * H }, { ...allOn, remindLeave: false })
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

describe("extra hours reminder", () => {
  const started = 19 * H; // extra session started at 19:00

  it("fires once the session has run long enough, and only while it's running", () => {
    const open = { extraEntryMinutes: started };
    expect(kindsAt(started + EXTRA_RUNNING_REMINDER_MINUTES - 1, open)).toEqual([]);
    expect(kindsAt(started + EXTRA_RUNNING_REMINDER_MINUTES, open)).toEqual(["extra-running"]);
    expect(
      kindsAt(started + EXTRA_RUNNING_REMINDER_MINUTES, { ...open, extraOutMinutes: 21 * H })
    ).toEqual([]);
  });

  it("applies on days off and leave, unlike the regular reminders", () => {
    // a holiday has no regular reminders, but a running extra session still gets one
    expect(
      kindsAt(started + EXTRA_RUNNING_REMINDER_MINUTES, {
        extraEntryMinutes: started,
        leaveType: "holiday",
      })
    ).toEqual(["extra-running"]);
  });

  it("follows the clock-out reminder preference", () => {
    expect(
      kindsAt(
        started + EXTRA_RUNNING_REMINDER_MINUTES,
        { extraEntryMinutes: started },
        { ...allOn, remindClockOut: false }
      )
    ).toEqual([]);
  });
});
