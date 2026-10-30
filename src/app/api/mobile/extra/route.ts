import { clearExtraHours, saveExtraHours } from "@/lib/attendance-service";
import { json, readBody, resultResponse, str, withMobileUser } from "@/lib/mobile-api";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const POST = withMobileUser(async (req, user) => {
  const body = await readBody(req);
  return resultResponse(
    await saveExtraHours(user.id, {
      date: str(body.date),
      extraEntryTime: str(body.extraEntryTime),
      extraOutTime: str(body.extraOutTime),
    })
  );
});

/** Removes a day's extra hours (DELETE ?date=YYYY-MM-DD). */
export const DELETE = withMobileUser(async (req, user) => {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!DATE_KEY.test(date)) return json({ error: "Invalid date" }, 400);
  await clearExtraHours(user.id, date);
  return json({ success: true });
});
