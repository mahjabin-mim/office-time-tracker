"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button, ButtonProps } from "@/components/ui/Button";
import { ExtraHoursForm } from "@/components/dashboard/ExtraHoursForm";
import type { DayRow } from "@/lib/calendar";
import { formatDayLabel } from "@/lib/time";

export function ExtraHoursDialogButton({
  row,
  label,
  variant = "primary",
  size = "md",
  icon,
  className,
}: {
  row: DayRow;
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
        title={row.extraEntryMinutes != null ? "Edit extra hours" : "Add extra hours"}
        description="Record the extra time you worked on top of your day."
      >
        <ExtraHoursForm
          row={row}
          dateLabel={formatDayLabel(row.date)}
          onSaved={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
