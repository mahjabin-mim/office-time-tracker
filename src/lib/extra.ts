import "server-only";
import { db } from "@/lib/db";
import { END_OF_DAY_MINUTES, addDays, type ZonedNow } from "@/lib/time";

/**
 * Closes extra-hours sessions left open on a past day at 11:59 PM and continues them on each
 * following day from 12:00 AM, up to the session still running today. Runs whenever the user's
 * days are read, so it needs no scheduler. A day that already has its own extra session stops
 * the carry-over.
 */
export async function settleExtraSessions(userId: string, now: ZonedNow): Promise<void> {
  const open = await db.attendance.findMany({
    where: {
      userId,
      extraEntryMinutes: { not: null },
      extraOutMinutes: null,
      date: { lt: now.date },
    },
    orderBy: { date: "asc" },
  });
  if (open.length === 0) return;

  await db.$transaction(async (tx) => {
    for (const record of open) {
      await tx.attendance.update({
        where: { id: record.id },
        data: { extraOutMinutes: END_OF_DAY_MINUTES },
      });

      for (let date = addDays(record.date, 1); date <= now.date; date = addDays(date, 1)) {
        const where = { userId_date: { userId, date } };
        const existing = await tx.attendance.findUnique({ where });
        if (existing?.extraEntryMinutes != null) break;

        const extraOutMinutes = date < now.date ? END_OF_DAY_MINUTES : null;
        await tx.attendance.upsert({
          where,
          create: { userId, date, extraEntryMinutes: 0, extraOutMinutes },
          update: { extraEntryMinutes: 0, extraOutMinutes },
        });
      }
    }
  });
}
