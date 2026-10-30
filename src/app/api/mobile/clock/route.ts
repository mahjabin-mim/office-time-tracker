import { clockAttendance } from "@/lib/attendance-service";
import { resultResponse, withMobileUser } from "@/lib/mobile-api";

export const POST = withMobileUser(async (_req, user) => resultResponse(await clockAttendance(user.id)));
