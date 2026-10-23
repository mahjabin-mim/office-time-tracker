"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTimezoneAction } from "@/lib/actions/settings";

/** Keeps the user's saved time zone in step with this device, so "today" is always local. */
export function TimezoneSync({ current }: { current: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === current) return;
    updateTimezoneAction(detected).then((changed) => {
      if (changed) router.refresh();
    });
  }, [current, router]);

  return null;
}
