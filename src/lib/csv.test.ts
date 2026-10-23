import { describe, expect, it } from "vitest";
import { buildDayRows } from "@/lib/calendar";
import { csvCell, hhmm, rowsToCsv } from "@/lib/csv";
import { dateKeyToDate, getZonedNow } from "@/lib/time";

describe("hhmm", () => {
  it("formats durations as h:mm for spreadsheets", () => {
    expect(hhmm(545)).toBe("9:05");
    expect(hhmm(-30)).toBe("-0:30");
    expect(hhmm(90, true)).toBe("+1:30");
    expect(hhmm(0, true)).toBe("0:00");
    expect(hhmm(null)).toBe("");
  });
});

describe("csvCell", () => {
  it("quotes only cells that need it", () => {
    expect(csvCell("Extra")).toBe("Extra");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("rowsToCsv", () => {
  const now = getZonedNow("Asia/Dhaka", new Date(Date.UTC(2026, 9, 23, 8, 0)));
  const rows = buildDayRows({
    rangeStart: dateKeyToDate("2026-10-21"),
    rangeEnd: dateKeyToDate("2026-10-22"),
    records: [
      { date: dateKeyToDate("2026-10-21"), entryMinutes: null, outMinutes: null, isHalfDay: false, leaveType: "sick" },
      { date: dateKeyToDate("2026-10-22"), entryMinutes: 540, outMinutes: 1155, isHalfDay: false, leaveType: null },
    ],
    schedule: { expectedDailyMinutes: 540, breakMinutes: 60, halfDayMinutes: 270, workingDays: "0,1,2,3,4" },
    now,
  });
  const lines = rowsToCsv(rows).trimEnd().split("\r\n");

  it("has a header and one line per day, using CRLF", () => {
    expect(lines[0]).toBe("Date,Weekday,Entry,Out,Half day,Worked,Expected,Difference,Status");
    expect(lines).toHaveLength(3);
  });

  it("writes leave and worked days", () => {
    expect(lines[1]).toBe("2026-10-21,Wednesday,,,No,,,,Sick leave");
    expect(lines[2]).toBe("2026-10-22,Thursday,09:00,19:15,No,9:15,9:00,+0:15,Extra");
  });
});
