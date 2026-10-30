import { deleteAttendance, saveAttendance } from "@/lib/attendance-service";
import { json, readBody, resultResponse, str, withMobileUser } from "@/lib/mobile-api";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Saves a day's regular entry/out times, or marks it as leave or a holiday. */
export const POST = withMobileUser(async (req, user) => {
  const body = await readBody(req);
  return resultResponse(
    await saveAttendance(user.id, {
      date: str(body.date),
      dayType: str(body.dayType) || "work",
      entryTime: str(body.entryTime),
      outTime: str(body.outTime),
      isHalfDay: body.isHalfDay === true,
    })
  );
});

/** Clears a day (DELETE ?date=YYYY-MM-DD); its extra hours are kept. */
export const DELETE = withMobileUser(async (req, user) => {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!DATE_KEY.test(date)) return json({ error: "Invalid date" }, 400);
  await deleteAttendance(user.id, date);
  return json({ success: true });
});
