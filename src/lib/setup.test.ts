import { describe, expect, it } from "vitest";
import { needsWorkdaySetup, scheduleFromSetup, suggestedLateAfter } from "@/lib/setup";
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

describe("needsWorkdaySetup", () => {
  const created = new Date("2026-10-23T07:54:50.463Z");
  const untouched = { createdAt: created, updatedAt: created };
  const saved = { createdAt: created, updatedAt: new Date("2026-10-24T09:00:00.000Z") };

  it("holds a new account until it finishes setup", () => {
    expect(needsWorkdaySetup({ needsSetup: true }, saved)).toBe(true);
  });

  it("holds an older account whose default schedule was never saved", () => {
    expect(needsWorkdaySetup({ needsSetup: false }, untouched)).toBe(true);
    expect(needsWorkdaySetup({ needsSetup: false }, null)).toBe(true);
  });

  it("lets an account through once its schedule has been saved", () => {
    expect(needsWorkdaySetup({ needsSetup: false }, saved)).toBe(false);
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
    reminders: null,
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
