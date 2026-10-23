"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button, ButtonProps } from "@/components/ui/Button";
import { AttendanceForm } from "@/components/dashboard/AttendanceForm";
import type { DayRow } from "@/lib/calendar";
import { formatDayLabel } from "@/lib/time";

export function AttendanceDialogButton({
  row,
  halfDayMinutes,
  label,
  variant = "primary",
  size = "md",
  icon,
  className,
}: {
  row: DayRow;
  halfDayMinutes: number;
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasRecord = row.entryMinutes != null || row.outMinutes != null || row.leaveType != null;

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={hasRecord ? "Edit day" : row.isFuture ? "Plan a day off" : "Add time"}
        description={
          row.isFuture
            ? "Mark an upcoming day as leave or a holiday."
            : "Record your entry and out time, or mark the day as leave."
        }
      >
        <AttendanceForm
          row={row}
          dateLabel={formatDayLabel(row.date)}
          hasRecord={hasRecord}
          halfDayMinutes={halfDayMinutes}
          onSaved={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
