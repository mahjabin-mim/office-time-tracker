"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button, ButtonProps } from "@/components/ui/Button";
import { AttendanceForm } from "@/components/dashboard/AttendanceForm";

export function AttendanceDialogButton({
  dateKey,
  dateLabel,
  initialEntry,
  initialOut,
  hasRecord,
  label,
  variant = "primary",
  size = "md",
  icon,
  className,
}: {
  dateKey: string;
  dateLabel: string;
  initialEntry?: string;
  initialOut?: string;
  hasRecord?: boolean;
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={hasRecord ? "Edit time" : "Add time"}
        description="Record your entry and out time for this day."
      >
        <AttendanceForm
          dateKey={dateKey}
          dateLabel={dateLabel}
          initialEntry={initialEntry}
          initialOut={initialOut}
          hasRecord={hasRecord}
          onSaved={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
