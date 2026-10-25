import type { DayRow } from "@/lib/calendar";
import { LEAVE_LABELS, STATUS_LABELS, WEEKDAYS, minutesToClock } from "@/lib/time";

/** Formats minutes as h:mm (e.g. 8:05, -0:30), which spreadsheets read as a duration. */
export function hhmm(minutes: number | null, signed = false): string {
  if (minutes == null) return "";
  const sign = minutes < 0 ? "-" : signed && minutes > 0 ? "+" : "";
  const abs = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function rowsToCsv(rows: DayRow[]): string {
  const header = [
    "Date",
    "Weekday",
    "Entry",
    "Out",
    "Half day",
    "Worked",
    "Expected",
    "Difference",
    "Extra entry",
    "Extra out",
    "Extra hours",
    "Late",
    "Status",
  ];
  const lines = rows.map((row) =>
    [
      row.dateKey,
      WEEKDAYS[row.date.getUTCDay()],
      row.entryMinutes != null ? minutesToClock(row.entryMinutes, "24h") : "",
      row.outMinutes != null ? minutesToClock(row.outMinutes, "24h") : "",
      row.isHalfDay ? "Yes" : "No",
      hhmm(row.workedMinutes),
      row.expectedMinutes > 0 ? hhmm(row.expectedMinutes) : "",
      hhmm(row.differenceMinutes, true),
      row.extraEntryMinutes != null ? minutesToClock(row.extraEntryMinutes, "24h") : "",
      row.extraOutMinutes != null ? minutesToClock(row.extraOutMinutes, "24h") : "",
      hhmm(row.extraInProgress ? null : row.extraMinutes),
      row.isLate ? "Yes" : "",
      row.leaveType ? LEAVE_LABELS[row.leaveType] : STATUS_LABELS[row.status],
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...lines].join("\r\n") + "\r\n";
}
