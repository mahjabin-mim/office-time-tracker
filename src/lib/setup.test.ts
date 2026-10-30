import { describe, expect, it } from "vitest";
import { scheduleFromSetup, suggestedLateAfter } from "@/lib/setup";
import { setupSchema } from "@/lib/validation";

const H = 60;

describe("scheduleFromSetup", () => {
  it("ends the day after the daily hours and halves them for a half day", () => {
    expect(
      scheduleFromSetup({ workingDays: [4, 0, 2, 1, 3], workStartMinutes: 9 * H, expectedDailyMinutes: 9 * H })
    ).toEqual({
      expectedDailyMinutes: 9 * H,
      halfDayMinutes: 4.5 * H,
      workStartMinutes: 9 * H,
      workEndMinutes: 18 * H,
      workingDays: "0,1,2,3,4",
    });
  });

  it("rounds an odd half day to whole minutes and keeps the end before midnight", () => {
    const schedule = scheduleFromSetup({
      workingDays: [1, 1, 5],
      workStartMinutes: 20 * H,
      expectedDailyMinutes: 7 * H + 45,
    });
    expect(schedule.halfDayMinutes).toBe(233);
    expect(schedule.workEndMinutes).toBe(1439);
    expect(schedule.workingDays).toBe("1,5");
  });
});

describe("suggestedLateAfter", () => {
  it("is half an hour after the start", () => {
    expect(suggestedLateAfter(9 * H)).toBe(9 * H + 30);
    expect(suggestedLateAfter(23 * H + 50)).toBe(1439);
  });
});

describe("setupSchema", () => {
  const valid = {
    workingDays: [0, 1, 2, 3, 4],
    workStartMinutes: 9 * H,
    expectedDailyMinutes: 9 * H,
    lateAfterMinutes: null,
    timeFormat: "12h",
    remindClockIn: false,
    remindLeave: true,
    remindClockOut: false,
  };

  it("accepts a complete setup", () => {
    expect(setupSchema.safeParse(valid).success).toBe(true);
  });

  it("needs at least one working day and an hour of work", () => {
    const result = setupSchema.safeParse({ ...valid, workingDays: [], expectedDailyMinutes: 30 });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      "Choose the days you work",
      "A workday must be at least 1 hour",
    ]);
  });
});
