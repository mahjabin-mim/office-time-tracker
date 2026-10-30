import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { User, WorkSchedule } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionSecret } from "@/lib/session-secret";
import { readSessionPayload } from "@/lib/session-payload";
import type { DayRow } from "@/lib/calendar";
import type { AttendanceResult } from "@/lib/attendance-service";

// The iOS app can't use the httpOnly session cookie, so it sends a bearer token instead. It's
// the same signed claims as the cookie, stamped with its own audience, and is revoked the same
// way: bumping User.sessionVersion (password change, "Log out of all devices").
const MOBILE_AUDIENCE = "ott-mobile";
const MOBILE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export async function createMobileToken(user: { id: string; sessionVersion: number }) {
  return new SignJWT({ userId: user.id, v: user.sessionVersion, rem: true })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(MOBILE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MOBILE_MAX_AGE)
    .sign(getSessionSecret());
}

async function getMobileUser(req: NextRequest): Promise<User | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = /^Bearer (.+)$/i.exec(header)?.[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { audience: MOBILE_AUDIENCE });
    const session = readSessionPayload(payload);
    if (!session) return null;
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.sessionVersion !== session.version) return null;
    return user;
  } catch {
    return null;
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Maps a shared service result to a response: 200 on success, 422 with the errors otherwise. */
export function resultResponse(result: AttendanceResult): Response {
  if (result?.success) return json({ success: true });
  return json({ error: result?.error, fieldErrors: result?.fieldErrors }, 422);
}

/** Reads a JSON body, or an empty object when it's missing or malformed. */
export async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Wraps a handler that needs a signed-in user; anyone else gets a 401. */
export function withMobileUser<Ctx>(
  handler: (req: NextRequest, user: User, ctx: Ctx) => Promise<Response>
) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const user = await getMobileUser(req);
    if (!user) return json({ error: "Your session has expired. Please log in again." }, 401);
    return handler(req, user, ctx);
  };
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timeFormat: user.timeFormat,
    timezone: user.timezone,
    hasPassword: user.passwordHash != null,
    remindClockIn: user.remindClockIn,
    remindLeave: user.remindLeave,
    remindClockOut: user.remindClockOut,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeSchedule(schedule: WorkSchedule) {
  return {
    expectedDailyMinutes: schedule.expectedDailyMinutes,
    halfDayMinutes: schedule.halfDayMinutes,
    workStartMinutes: schedule.workStartMinutes,
    workEndMinutes: schedule.workEndMinutes,
    workingDays: schedule.workingDays
      .split(",")
      .map(Number)
      .filter((d) => Number.isInteger(d)),
    lateAfterMinutes: schedule.lateAfterMinutes,
  };
}

/** A day without its Date object; the client keys days by dateKey (YYYY-MM-DD). */
export function serializeRow({ date: _date, ...row }: DayRow) {
  return row;
}
